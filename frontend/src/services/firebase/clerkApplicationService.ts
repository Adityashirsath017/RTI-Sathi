import { generateAllTranslations } from '../translationService';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import {
  Application,
  ApplicationEvent,
  AuditEventType,
  Clarification,
  ClerkProfile,
  DashboardStats,
  QueueFilters,
} from '@/types';

class ClerkApplicationService {
  /**
   * Fetches applications for the Clerk review queue with filters directly from Firestore
   * Sorted by oldest first (FIFO queue)
   */
  public async getReviewQueue(filters?: QueueFilters): Promise<Application[]> {
    let results: Application[] = [];

    try {
      const appsRef = collection(db, 'applications');
      const constraints: any[] = [];

      if (filters?.status && filters.status !== 'all') {
        constraints.push(where('status', '==', filters.status));
      }
      if (filters?.ambiguousOnly) {
        constraints.push(where('humanReviewRequired', '==', true));
      }
      if (filters?.department && filters.department !== 'all') {
        constraints.push(where('recommendedDepartment', '==', filters.department));
      }

      constraints.push(orderBy('createdAt', 'asc'));
      constraints.push(limit(150));

      const q = query(appsRef, ...constraints);
      const snap = await getDocs(q);
      results = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Application[];
    } catch (err: any) {
      console.warn('[Clerk] Firestore getReviewQueue indexed query warning, falling back to simple query:', err);
      try {
        const simpleSnap = await getDocs(query(collection(db, 'applications'), limit(200)));
        results = simpleSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Application[];
      } catch (fallbackErr) {
        console.error('[Clerk] Firestore query error:', fallbackErr);
        results = [];
      }
    }

    // Apply in-memory filters for fields that don't have composite indexes
    if (filters?.status && filters.status !== 'all') {
      results = results.filter((a) => a.status === filters.status);
    }
    if (filters?.ambiguousOnly) {
      results = results.filter((a) => a.humanReviewRequired || a.ambiguity);
    }
    if (filters?.department && filters.department !== 'all') {
      results = results.filter((a) => a.recommendedDepartment === filters.department);
    }
    if (filters?.state && filters.state !== 'all') {
      results = results.filter((a) => a.structuredRequirement?.state === filters.state);
    }
    if (filters?.district && filters.district !== 'all') {
      results = results.filter((a) => a.structuredRequirement?.district === filters.district);
    }
    if (filters?.language && filters.language !== 'all') {
      results = results.filter((a) => a.originalLanguage === filters.language);
    }
    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const ql = filters.searchQuery.toLowerCase().trim();
      results = results.filter(
        (a) =>
          a.applicationId?.toLowerCase().includes(ql) ||
          a.structuredRequirement?.subject?.toLowerCase().includes(ql) ||
          a.citizenName?.toLowerCase().includes(ql) ||
          (a as any).userName?.toLowerCase().includes(ql) ||
          a.originalUserInput?.toLowerCase().includes(ql) ||
          a.recommendedDepartment?.toLowerCase().includes(ql)
      );
    }

    // Sort FIFO oldest first
    results.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    return results;
  }

  /**
   * Real-time listener for the review queue
   */
  public subscribeToQueue(callback: (apps: Application[]) => void): () => void {
    try {
      const q = query(collection(db, 'applications'), limit(200));
      return onSnapshot(
        q,
        (snap) => {
          const apps = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Application[];
          callback(apps);
        },
        (error) => {
          console.warn('[Clerk] Real-time queue subscription error:', error);
          callback([]);
        }
      );
    } catch (e) {
      console.error('[Clerk] subscribeToQueue exception:', e);
      callback([]);
      return () => {};
    }
  }

  /**
   * Fetches an application by readable applicationId or doc id
   */
  public async getApplicationById(id: string): Promise<Application | null> {
    try {
      // 1. Try doc directly
      const docRef = doc(db, 'applications', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Application;
      }

      // 2. Try where applicationId == id
      const q = query(collection(db, 'applications'), where('applicationId', '==', id), limit(1));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const d = querySnap.docs[0];
        return { id: d.id, ...d.data() } as Application;
      }

      // 3. Fallback to rti_applications
      const rtiRef = doc(db, 'rti_applications', id);
      const rtiSnap = await getDoc(rtiRef);
      if (rtiSnap.exists()) {
        return { id: rtiSnap.id, ...rtiSnap.data() } as Application;
      }
    } catch (err) {
      console.warn('[Clerk] Error fetching application by ID:', err);
    }

    return null;
  }

  /**
   * Real-time listener for a single application's document
   */
  public subscribeToApplication(id: string, callback: (app: Application | null) => void): () => void {
    try {
      const docRef = doc(db, 'applications', id);
      return onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            callback({ id: snap.id, ...snap.data() } as Application);
          } else {
            // Check by applicationId query
            const q = query(collection(db, 'applications'), where('applicationId', '==', id), limit(1));
            getDocs(q).then((qSnap) => {
              if (!qSnap.empty) {
                const d = qSnap.docs[0];
                callback({ id: d.id, ...d.data() } as Application);
              } else {
                callback(null);
              }
            }).catch(() => callback(null));
          }
        },
        (err) => {
          console.warn('[Clerk] subscribeToApplication listener warning:', err);
          callback(null);
        }
      );
    } catch (e) {
      callback(null);
      return () => {};
    }
  }

  /**
   * Fetches aggregate statistics directly from Firestore
   */
  public async getDashboardStats(): Promise<DashboardStats> {
    const apps = await this.getReviewQueue();
    const todayStr = new Date().toISOString().slice(0, 10);

    let pendingReviews = 0;
    let ambiguousCases = 0;
    let clarificationRequired = 0;
    let approvedToday = 0;
    let routedToday = 0;
    let totalReviewed = 0;

    apps.forEach((app) => {
      if (['submitted', 'human_review_required', 'under_clerk_review', 'resubmitted'].includes(app.status)) {
        pendingReviews++;
      }
      if (app.humanReviewRequired || app.ambiguity) {
        ambiguousCases++;
      }
      if (app.status === 'clarification_required') {
        clarificationRequired++;
      }
      if (app.status === 'approved' && app.approvedAt?.startsWith(todayStr)) {
        approvedToday++;
      }
      if (app.status === 'routed' && app.routedAt?.startsWith(todayStr)) {
        routedToday++;
      }
      if (['approved', 'routed', 'closed'].includes(app.status)) {
        totalReviewed++;
      }
    });

    return {
      pendingReviews,
      ambiguousCases,
      clarificationRequired,
      approvedToday,
      routedToday,
      totalReviewed,
    };
  }

  /**
   * Marks application as under review by the authenticated clerk
   */
  public async startReview(applicationId: string, clerk: ClerkProfile): Promise<void> {
    const app = await this.getApplicationById(applicationId);
    if (!app) return;

    if (['approved', 'routed', 'closed'].includes(app.status)) return;

    const now = new Date().toISOString();
    const updates = {
      status: 'under_clerk_review',
      assignedClerkId: clerk.uid,
      assignedClerkName: clerk.name,
      assignedAt: now,
      updatedAt: now,
    };

    try {
      await updateDoc(doc(db, 'applications', app.id), updates);
      try { await setDoc(doc(db, 'rti_applications', app.id), updates, { merge: true }); } catch (e) {}
    } catch (e) {
      console.warn('[Clerk] startReview write notice:', e);
    }

    await this.recordAuditEvent(
      app.id,
      'CLERK_REVIEW_STARTED',
      `Routing Officer ${clerk.name} (${clerk.employeeId}) initiated active review of application.`,
      clerk.uid,
      'clerk',
      { assignedClerkId: clerk.uid, assignedClerkName: clerk.name }
    );
  }

  /**
   * Clerk approves and routes application to the confirmed public authority
   */
  public async approveAndRoute(
    applicationId: string,
    department: string,
    clerkNotes: string,
    clerk: ClerkProfile
  ): Promise<void> {
    const app = await this.getApplicationById(applicationId);
    if (!app) throw new Error('Application not found');

    const now = new Date().toISOString();
    const isConfirmed = app.recommendedDepartment === department;

    const updates: Partial<Application> = {
      status: 'approved',
      confirmedDepartment: department,
      finalDepartment: department,
      decisionType: isConfirmed ? 'AI_CONFIRMED' : 'CLERK_APPROVED',
      clerkNotes: clerkNotes || '',
      reviewedBy: clerk.uid,
      reviewedAt: now,
      approvedAt: now,
      routedAt: now,
      updatedAt: now,
    };

    // Update canonical application
    await updateDoc(doc(db, 'applications', app.id), updates);
    try { await setDoc(doc(db, 'rti_applications', app.id), updates, { merge: true }); } catch (e) {}

    // Record immutable audit event
    await this.recordAuditEvent(
      app.id,
      'CLERK_APPROVED_AND_ROUTED',
      `Routing Officer ${clerk.name} approved application for dispatch to: ${department}`,
      clerk.uid,
      'clerk',
      {
        confirmedDepartment: department,
        aiRecommendedDepartment: app.recommendedDepartment,
        aiConfidence: app.confidenceScore,
        clerkNotes,
      }
    );

    // Create real-time notification for citizen in Firestore
    if (app.userId) {
      try {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          notificationId: notifRef.id,
          userId: app.userId,
          recipientRole: 'citizen',
          applicationId: app.applicationId,
          type: 'APPLICATION_APPROVED',
          title: 'RTI Application Approved for Routing',
          message: `Your RTI application ${app.applicationId} has been verified and routed to ${department}.`,
          read: false,
          createdAt: now,
        });
      } catch (err) {
        console.warn('[Clerk] Notification write warning:', err);
      }
    }
  }

  /**
   * Clerk overrides AI department recommendation with mandatory reason
   */
  public async overrideDepartment(
    applicationId: string,
    newDepartment: string,
    overrideReason: string,
    clerk: ClerkProfile
  ): Promise<void> {
    if (!overrideReason || !overrideReason.trim()) {
      throw new Error('Override justification reason is required.');
    }

    const app = await this.getApplicationById(applicationId);
    if (!app) throw new Error('Application not found');

    const now = new Date().toISOString();
    const previousDept = app.recommendedDepartment || 'Unspecified';

    const updates: Partial<Application> = {
      status: 'approved',
      confirmedDepartment: newDepartment,
      clerkSelectedDepartment: newDepartment,
      finalDepartment: newDepartment,
      override: true,
      overrideReason: overrideReason.trim(),
      decisionType: 'CLERK_OVERRIDE',
      reviewedBy: clerk.uid,
      reviewedAt: now,
      approvedAt: now,
      routedAt: now,
      updatedAt: now,
    };

    await updateDoc(doc(db, 'applications', app.id), updates);
    try { await setDoc(doc(db, 'rti_applications', app.id), updates, { merge: true }); } catch (e) {}

    await this.recordAuditEvent(
      app.id,
      'DEPARTMENT_OVERRIDDEN',
      `Department overridden by officer ${clerk.name} from "${previousDept}" to "${newDepartment}". Reason: ${overrideReason}`,
      clerk.uid,
      'clerk',
      {
        aiRecommendedDepartment: previousDept,
        clerkSelectedDepartment: newDepartment,
        overrideReason,
      }
    );

    if (app.userId) {
      try {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          notificationId: notifRef.id,
          userId: app.userId,
          recipientRole: 'citizen',
          applicationId: app.applicationId,
          type: 'DEPARTMENT_OVERRIDDEN',
          title: 'RTI Routed to Public Authority',
          message: `Your RTI request ${app.applicationId} was reviewed by the routing officer and routed to ${newDepartment}.`,
          read: false,
          createdAt: now,
        });
      } catch (err) {}
    }
  }

  /**
   * Clerk requests clarification from the citizen with complete details & field specifications
   */
  public async requestClarification(
    applicationId: string,
    clarificationInput: {
      question: string;
      category?: string;
      requestedFields?: string[];
      whatIsMissing?: string;
      whatToProvide?: string;
    },
    clerk: ClerkProfile
  ): Promise<void> {
    const { question, category, requestedFields, whatIsMissing, whatToProvide } = clarificationInput;
    if (!question || !question.trim()) {
      throw new Error('Clarification question cannot be empty.');
    }

    const app = await this.getApplicationById(applicationId);
    if (!app) throw new Error('Application not found');

    const now = new Date().toISOString();
    const clarId = `clar_${Date.now()}`;

    const clerkLang = clerk.preferredLanguage || 'en';
    let translations: Record<string, string> | undefined;
    let whatIsMissingTranslations: Record<string, string> | undefined;
    let whatToProvideTranslations: Record<string, string> | undefined;

    try {
      translations = await generateAllTranslations(question.trim(), clerkLang);
      if (whatIsMissing && whatIsMissing.trim()) {
        whatIsMissingTranslations = await generateAllTranslations(whatIsMissing.trim(), clerkLang);
      }
      if (whatToProvide && whatToProvide.trim()) {
        whatToProvideTranslations = await generateAllTranslations(whatToProvide.trim(), clerkLang);
      }
    } catch (err) {
      console.warn('Clarification translation warning:', err);
    }

    const clarData: Clarification = {
      clarificationId: clarId,
      applicationId: app.applicationId,
      clarificationQuestion: question.trim(),
      clarificationMessage: question.trim(),
      originalText: question.trim(),
      originalLanguage: clerkLang,
      translations,
      whatIsMissingTranslations,
      whatToProvideTranslations,
      category: category || 'General information unclear',
      reason: whatIsMissing || '',
      requestedFields: requestedFields || [],
      whatIsMissing: whatIsMissing || '',
      whatToProvide: whatToProvide || '',
      createdBy: clerk.uid,
      requestedBy: clerk.name,
      createdAt: now,
      requestedAt: now,
      status: 'pending',
    };

    const previousHistory = app.clarificationHistory || [];
    const updatedHistory = [...previousHistory, clarData];

    const updates: Partial<Application> = {
      status: 'clarification_required',
      activeClarification: clarData,
      clarificationHistory: updatedHistory,
      updatedAt: now,
    };

    await updateDoc(doc(db, 'applications', app.id), updates);
    try { await setDoc(doc(db, 'rti_applications', app.id), updates, { merge: true }); } catch (e) {}

    // Subcollection clarification record
    try {
      const clarRef = doc(collection(db, 'applications', app.id, 'clarifications'), clarId);
      await setDoc(clarRef, clarData);
      const rtiClarRef = doc(collection(db, 'rti_applications', app.id, 'clarifications'), clarId);
      await setDoc(rtiClarRef, clarData);
    } catch (err) {
      console.warn('[Clerk] Clarification subcollection write notice:', err);
    }

    await this.recordAuditEvent(
      app.id,
      'CLARIFICATION_REQUESTED',
      `Officer ${clerk.name} requested clarification: "${question.trim()}"`,
      clerk.uid,
      'clerk',
      {
        clarificationId: clarId,
        category: clarData.category,
        requestedFields: clarData.requestedFields,
      }
    );

    // Notify citizen in real-time
    if (app.userId) {
      try {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          notificationId: notifRef.id,
          userId: app.userId,
          recipientRole: 'citizen',
          applicationId: app.applicationId,
          type: 'CLARIFICATION_REQUIRED',
          title: 'Action Required: Clarification Requested',
          message: `Routing officer has requested clarification on ${app.applicationId}: "${question.trim()}"`,
          read: false,
          createdAt: now,
        });
      } catch (err) {}
    }
  }

  /**
   * Saves private internal notes for clerks (invisible to citizen)
   */
  public async saveInternalNotes(
    applicationId: string,
    notes: string,
    clerk: ClerkProfile
  ): Promise<void> {
    const app = await this.getApplicationById(applicationId);
    if (!app) throw new Error('Application not found');

    const now = new Date().toISOString();
    await updateDoc(doc(db, 'applications', app.id), {
      internalClerkNotes: notes,
      updatedAt: now,
    });
    try {
      await updateDoc(doc(db, 'rti_applications', app.id), {
        internalClerkNotes: notes,
        updatedAt: now,
      });
    } catch (e) {}
  }

  /**
   * Fetches the immutable audit event timeline for an application
   */
  public async getApplicationEvents(applicationId: string): Promise<ApplicationEvent[]> {
    const app = await this.getApplicationById(applicationId);
    if (!app) return [];

    try {
      const q = query(
        collection(db, 'applications', app.id, 'events'),
        orderBy('timestamp', 'asc')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => ({
          eventId: d.id,
          ...d.data(),
        })) as ApplicationEvent[];
      }
    } catch (err) {
      console.warn('[Clerk] getApplicationEvents notice:', err);
    }

    return [];
  }

  /**
   * Fetches clarification history for an application
   */
  public async getApplicationClarifications(applicationId: string): Promise<Clarification[]> {
    const app = await this.getApplicationById(applicationId);
    if (!app) return [];

    // Return stored history on doc if present
    if (app.clarificationHistory && app.clarificationHistory.length > 0) {
      return [...app.clarificationHistory].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    try {
      const q = query(
        collection(db, 'applications', app.id, 'clarifications'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => ({
          clarificationId: d.id,
          ...d.data(),
        })) as Clarification[];
      }
    } catch (err) {
      console.warn('[Clerk] getApplicationClarifications notice:', err);
    }

    return app.activeClarification ? [app.activeClarification] : [];
  }

  /**
   * Helper to append an immutable audit event
   */
  public async recordAuditEvent(
    appDocId: string,
    eventType: AuditEventType,
    description: string,
    actorId: string,
    actorRole: 'clerk' | 'citizen' | 'system' = 'clerk',
    metadata?: Record<string, any>
  ): Promise<void> {
    const now = new Date().toISOString();
    const eventId = `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const eventData: ApplicationEvent = {
      eventId,
      applicationId: appDocId,
      eventType,
      description,
      actorId,
      actorRole,
      metadata: metadata || {},
      timestamp: now,
    };

    try {
      const eventRef = doc(collection(db, 'applications', appDocId, 'events'));
      await setDoc(eventRef, eventData);
    } catch (err) {}
    try {
      const rtiEventRef = doc(collection(db, 'rti_applications', appDocId, 'events'));
      await setDoc(rtiEventRef, eventData);
    } catch (err) {}
    try {
      const topEventRef = doc(collection(db, 'application_events'));
      await setDoc(topEventRef, eventData);
    } catch (err) {}
  }
}

export const clerkApplicationService = new ClerkApplicationService();
