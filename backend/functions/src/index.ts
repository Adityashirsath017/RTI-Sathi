import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * Validates that the caller is an authenticated Clerk or Admin
 */
async function assertClerkOrAdmin(context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Check custom claims
  if (context.auth.token.role === 'clerk' || context.auth.token.role === 'admin') {
    return;
  }

  // Check user profile document in Firestore
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (userDoc.exists && ['clerk', 'admin'].includes(userDoc.data()?.role)) {
    return;
  }

  // Check clerk profile document
  const clerkDoc = await db.collection('clerks').doc(context.auth.uid).get();
  if (clerkDoc.exists && clerkDoc.data()?.isActive) {
    return;
  }

  throw new functions.https.HttpsError('permission-denied', 'Unauthorized. Only clerks or admins can perform this action.');
}

/**
 * Creates an immutable audit event for an application
 */
export const recordApplicationEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { applicationId, eventType, description, metadata } = data;
  if (!applicationId || !eventType) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing applicationId or eventType');
  }

  const eventRef = db.collection('applications').doc(applicationId).collection('events').doc();
  const eventData = {
    eventId: eventRef.id,
    applicationId,
    eventType,
    description: description || '',
    metadata: metadata || {},
    actorId: context.auth.uid,
    actorRole: context.auth.token.role || 'clerk',
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };

  await eventRef.set(eventData);
  return { success: true, eventId: eventRef.id };
});

/**
 * Clerk approves and routes application to the confirmed public authority
 */
export const clerkApproveAndRoute = functions.https.onCall(async (data, context) => {
  await assertClerkOrAdmin(context);

  const { applicationId, department, clerkNotes } = data;
  if (!applicationId || !department) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing applicationId or department');
  }

  const appRef = db.collection('applications').doc(applicationId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction) => {
    const appDoc = await transaction.get(appRef);
    if (!appDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Application does not exist');
    }

    const appData = appDoc.data()!;
    if (['approved', 'routed', 'closed'].includes(appData.status)) {
      throw new functions.https.HttpsError('failed-precondition', 'Application has already been finalized by another review.');
    }

    const isConfirmed = appData.recommendedDepartment === department;

    // Update application
    transaction.update(appRef, {
      status: 'approved',
      finalDepartment: department,
      confirmedDepartment: department,
      decisionType: isConfirmed ? 'AI_CONFIRMED' : 'CLERK_APPROVED',
      clerkNotes: clerkNotes || '',
      reviewedBy: context.auth!.uid,
      reviewedAt: now,
      approvedAt: now,
      updatedAt: now
    });

    // Record immutable audit event
    const eventRef = appRef.collection('events').doc();
    transaction.set(eventRef, {
      eventId: eventRef.id,
      applicationId,
      eventType: 'CLERK_APPROVED_AND_ROUTED',
      description: `Routing Officer approved application for dispatch to: ${department}`,
      metadata: {
        department,
        decisionType: isConfirmed ? 'AI_CONFIRMED' : 'CLERK_APPROVED',
        aiRecommendedDepartment: appData.recommendedDepartment || '',
        aiConfidence: appData.confidenceScore || 0,
        clerkNotes: clerkNotes || ''
      },
      actorId: context.auth!.uid,
      actorRole: 'clerk',
      timestamp: now
    });

    // Record routing slip in subcollection
    const routingRef = appRef.collection('routing').doc();
    transaction.set(routingRef, {
      routingId: routingRef.id,
      applicationId,
      dispatchedAuthority: department,
      dispatchedBy: context.auth!.uid,
      dispatchedAt: now,
      status: 'dispatched'
    });

    // Notify citizen
    if (appData.userId) {
      const notifRef = db.collection('notifications').doc();
      transaction.set(notifRef, {
        notificationId: notifRef.id,
        userId: appData.userId,
        applicationId,
        type: 'APPLICATION_APPROVED',
        title: 'RTI Application Approved for Routing',
        message: `Your RTI request has been verified and routed to ${department}.`,
        read: false,
        createdAt: now
      });
    }
  });

  return { success: true, message: 'Application successfully approved and routed' };
});

/**
 * Clerk overrides AI department recommendation with mandatory reason
 */
export const clerkOverrideDepartment = functions.https.onCall(async (data, context) => {
  await assertClerkOrAdmin(context);

  const { applicationId, newDepartment, overrideReason } = data;
  if (!applicationId || !newDepartment || !overrideReason?.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'applicationId, newDepartment, and overrideReason are required');
  }

  const appRef = db.collection('applications').doc(applicationId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction) => {
    const appDoc = await transaction.get(appRef);
    if (!appDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Application not found');
    }

    const appData = appDoc.data()!;
    if (['approved', 'routed', 'closed'].includes(appData.status)) {
      throw new functions.https.HttpsError('failed-precondition', 'Application is already finalized');
    }

    const previousDepartment = appData.recommendedDepartment || 'Unassigned';

    transaction.update(appRef, {
      status: 'approved',
      finalDepartment: newDepartment,
      clerkSelectedDepartment: newDepartment,
      confirmedDepartment: newDepartment,
      override: true,
      overrideReason: overrideReason.trim(),
      decisionType: 'CLERK_OVERRIDE',
      reviewedBy: context.auth!.uid,
      reviewedAt: now,
      approvedAt: now,
      updatedAt: now
    });

    // Immutable audit event
    const eventRef = appRef.collection('events').doc();
    transaction.set(eventRef, {
      eventId: eventRef.id,
      applicationId,
      eventType: 'DEPARTMENT_OVERRIDDEN',
      description: `Department overridden by officer from "${previousDepartment}" to "${newDepartment}". Reason: ${overrideReason}`,
      metadata: {
        aiRecommendedDepartment: previousDepartment,
        clerkSelectedDepartment: newDepartment,
        overrideReason
      },
      actorId: context.auth!.uid,
      actorRole: 'clerk',
      timestamp: now
    });

    // Routing slip
    const routingRef = appRef.collection('routing').doc();
    transaction.set(routingRef, {
      routingId: routingRef.id,
      applicationId,
      dispatchedAuthority: newDepartment,
      dispatchedBy: context.auth!.uid,
      dispatchedAt: now,
      status: 'dispatched'
    });

    // Notify citizen
    if (appData.userId) {
      const notifRef = db.collection('notifications').doc();
      transaction.set(notifRef, {
        notificationId: notifRef.id,
        userId: appData.userId,
        applicationId,
        type: 'DEPARTMENT_OVERRIDDEN',
        title: 'RTI Routed to Correct Public Authority',
        message: `Your RTI request has been reviewed by an officer and routed to ${newDepartment}.`,
        read: false,
        createdAt: now
      });
    }
  });

  return { success: true };
});

/**
 * Clerk requests clarification from citizen
 */
export const clerkRequestClarification = functions.https.onCall(async (data, context) => {
  await assertClerkOrAdmin(context);

  const { applicationId, question, category } = data;
  if (!applicationId || !question?.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing applicationId or question');
  }

  const appRef = db.collection('applications').doc(applicationId);
  const clarificationRef = appRef.collection('clarifications').doc();
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction) => {
    const appDoc = await transaction.get(appRef);
    if (!appDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Application not found');
    }
    const appData = appDoc.data()!;

    transaction.set(clarificationRef, {
      clarificationId: clarificationRef.id,
      applicationId,
      clarificationQuestion: question.trim(),
      category: category || 'Information unclear',
      createdBy: context.auth!.uid,
      createdAt: now,
      status: 'pending'
    });

    transaction.update(appRef, {
      status: 'clarification_required',
      activeClarification: {
        clarificationId: clarificationRef.id,
        applicationId,
        clarificationQuestion: question.trim(),
        category: category || 'Information unclear',
        createdBy: context.auth!.uid,
        createdAt: new Date().toISOString(),
        status: 'pending'
      },
      updatedAt: now
    });

    // Audit event
    const eventRef = appRef.collection('events').doc();
    transaction.set(eventRef, {
      eventId: eventRef.id,
      applicationId,
      eventType: 'CLARIFICATION_REQUESTED',
      description: `Clerk requested clarification: "${question.trim()}"`,
      metadata: { clarificationId: clarificationRef.id, category },
      actorId: context.auth!.uid,
      actorRole: 'clerk',
      timestamp: now
    });

    // Notify citizen
    if (appData.userId) {
      const notifRef = db.collection('notifications').doc();
      transaction.set(notifRef, {
        notificationId: notifRef.id,
        userId: appData.userId,
        applicationId,
        type: 'CLARIFICATION_REQUIRED',
        title: 'Action Required: Clarification Requested',
        message: `Routing officer has requested additional details: "${question.trim()}"`,
        read: false,
        createdAt: now
      });
    }
  });

  return { success: true, clarificationId: clarificationRef.id };
});

/**
 * Resubmits an application with citizen clarification response
 */
export const submitClarificationResponse = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { applicationId, clarificationId, citizenResponse, updatedRequirement } = data;
  if (!applicationId || !clarificationId || !citizenResponse) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const appRef = db.collection('applications').doc(applicationId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction) => {
    const appDoc = await transaction.get(appRef);
    if (!appDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Application not found');
    }

    const appData = appDoc.data()!;
    if (appData.userId !== context.auth!.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Only owner can respond to clarification');
    }

    const clarificationRef = appRef.collection('clarifications').doc(clarificationId);

    transaction.update(clarificationRef, {
      citizenResponse: citizenResponse.trim(),
      respondedAt: now,
      status: 'resolved'
    });

    const updatePayload: Record<string, any> = {
      status: 'resubmitted',
      'activeClarification.citizenResponse': citizenResponse.trim(),
      'activeClarification.status': 'resolved',
      'activeClarification.respondedAt': new Date().toISOString(),
      updatedAt: now
    };

    if (updatedRequirement) {
      updatePayload.finalUserApprovedRequirement = updatedRequirement;
    }

    transaction.update(appRef, updatePayload);

    // Record audit event
    const eventRef = appRef.collection('events').doc();
    transaction.set(eventRef, {
      eventId: eventRef.id,
      applicationId,
      eventType: 'USER_RESPONDED_TO_CLARIFICATION',
      description: 'Citizen provided required clarification and resubmitted application',
      metadata: { clarificationId, citizenResponse: citizenResponse.trim() },
      actorId: context.auth!.uid,
      actorRole: 'citizen',
      timestamp: now
    });
  });

  return { success: true, message: 'Clarification submitted successfully' };
});

/**
 * Saves internal private clerk notes (invisible to citizens)
 */
export const saveInternalClerkNotes = functions.https.onCall(async (data, context) => {
  await assertClerkOrAdmin(context);

  const { applicationId, internalNotes } = data;
  if (!applicationId) {
    throw new functions.https.HttpsError('invalid-argument', 'applicationId is required');
  }

  const appRef = db.collection('applications').doc(applicationId);
  const reviewRef = appRef.collection('reviews').doc(context.auth!.uid);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await reviewRef.set({
    clerkId: context.auth!.uid,
    internalNotes: internalNotes || '',
    updatedAt: now
  }, { merge: true });

  await appRef.update({
    internalClerkNotes: internalNotes || '',
    updatedAt: now
  });

  return { success: true };
});
