import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from './config';
import { sharedStore } from './sharedStore';
import { Application } from '@/types';

/**
 * Inserts realistic test applications for end-to-end verification.
 * Dual-mirrors to Firestore and the persistent shared store so records
 * are immediately available even under restrictive remote Firestore rules.
 */
export async function seedTestApplicationsIntoFirestore(): Promise<string[]> {
  const now = new Date();
  const createdIds: string[] = [];

  // 1. High Confidence PWD Case (Test 1)
  const test1DocId = 'test_app_pwd_high_conf';
  const test1: Application = {
    id: test1DocId,
    applicationId: 'RTI-2026-000101',
    userId: 'citizen_demo_rajesh',
    citizenName: 'Rajesh Sharma',
    status: 'submitted',
    createdAt: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
    submittedAt: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),

    originalLanguage: 'Hindi',
    originalUserInput: 'मेरे क्षेत्र में राज्य महामार्ग क्रमांक 4 के सड़क निर्माण के लिए पिछले 3 वर्षों में कितनी राशि स्वीकृत की गई है? ठेकेदार का नाम और कार्य की समयसीमा का विवरण प्रदान करें।',
    conversationSummary: 'Citizen is requesting information regarding fund allocation, contractor details, and completion schedule for State Highway 4 road construction in their area over the last 3 financial years.',

    structuredRequirement: {
      subject: 'State Highway 4 road construction fund allocation & contractor details',
      informationRequested: [
        'Total budget allocated for State Highway No. 4 construction (2023-2026)',
        'Name and registered office of appointed contractor / executing agency',
        'Stipulated completion deadline and actual physical progress percentage',
        'Certified copy of quality inspection audit reports'
      ],
      location: 'State Highway 4, Taluka Haveli',
      state: 'Maharashtra',
      district: 'Pune',
      timePeriod: '2023 - 2026',
      entities: ['State Highway 4', 'Contractor', 'Inspection Report'],
      documentsRequested: ['Sanction order', 'Work order copy', 'Inspection log']
    },

    recommendedDepartment: 'Public Works Department (PWD)',
    confidenceScore: 0.92,
    alternativeDepartments: [
      { department: 'Municipal Corporation / Urban Local Bodies', confidence: 0.38, reason: 'Highway passes through outer urban fringe' },
      { department: 'Rural Development & Panchayati Raj', confidence: 0.18, reason: 'Rural connectivity component' }
    ],
    ambiguity: false,
    humanReviewRequired: false,
    classificationReason: 'The request explicitly concerns State Highway infrastructure, fund allocation sanction orders, and state public works contractor execution.',
    evidence: ['state highway 4', 'road construction', 'sanctioned funds', 'contractor', 'work order'],

    rtiDraft: `To,
Public Information Officer (PIO)
Office of the Executive Engineer, Public Works Department (PWD)
Pune Division, Maharashtra

Subject: Request for Information under Section 6(1) of the Right to Information Act, 2005.

Sir / Madam,
Please furnish certified information regarding State Highway No. 4 road construction:
1. Total sanctioned budget and expenditure incurred from 2023 to 2026.
2. Certified copy of the work order issued to the appointed contractor.
3. Details of milestone completion dates and penalties imposed, if any.
4. Copy of third-party quality audit certificates.

Applicant: Rajesh Sharma, Pune, Maharashtra.`,
    priority: 'normal'
  };

  // 2. Ambiguous Case - PWD vs Municipal Corporation (Test 2)
  const test2DocId = 'test_app_ambiguous_pwd_mc';
  const test2: Application = {
    id: test2DocId,
    applicationId: 'RTI-2026-000102',
    userId: 'citizen_demo_priya',
    citizenName: 'Priya Kulkarni',
    status: 'human_review_required',
    createdAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
    submittedAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),

    originalLanguage: 'Marathi',
    originalUserInput: 'बाणेर-पाषाण लिंक रोडवरील नवीन डांबरीकरण आणि ड्रेनेज लाईन टाकण्याच्या कामाचा खर्च आणि कंत्राटदाराची माहिती हवी आहे. हे काम महापालिकेने केले आहे की सार्वजनिक बांधकाम खात्याने?',
    conversationSummary: 'Citizen seeks expenditure and contractor details for recent resurfacing and stormwater drainage pipeline work on Baner-Pashan Link Road, uncertain whether it falls under Municipal Corporation or State PWD.',

    structuredRequirement: {
      subject: 'Resurfacing and drainage pipeline expenditure on Baner-Pashan Link Road',
      informationRequested: [
        'Total expenditure incurred on road resurfacing and drainage work (2024-2025)',
        'Name of contractor and copy of tender agreement',
        'Jurisdiction confirmation: Whether maintenance responsibility lies with Municipal Corporation or PWD',
        'Guarantee / Defect Liability Period for the road work'
      ],
      location: 'Baner-Pashan Link Road, Ward 9',
      state: 'Maharashtra',
      district: 'Pune',
      timePeriod: '2024 - 2025',
      entities: ['Baner-Pashan Link Road', 'Drainage', 'Municipal Corporation', 'PWD'],
      documentsRequested: ['Tender agreement', 'Completion certificate']
    },

    recommendedDepartment: 'Public Works Department (PWD)',
    confidenceScore: 0.84,
    alternativeDepartments: [
      { department: 'Municipal Corporation / Urban Local Bodies', confidence: 0.82, reason: 'Urban arterial link road located within municipal ward boundary' },
      { department: 'Water Resources & Sanitation Department', confidence: 0.31, reason: 'Stormwater drainage network element' }
    ],
    ambiguity: true,
    humanReviewRequired: true,
    classificationReason: 'Ambiguous Jurisdiction: Road is an inter-neighborhood corridor with overlapping state PWD arterial classification and municipal ward civic jurisdiction. The confidence gap between PWD (84%) and Municipal Corporation (82%) is only 2%.',
    evidence: ['Baner-Pashan Link Road', 'resurfacing', 'drainage line', 'ward 9', 'municipal vs pwd'],

    rtiDraft: `To,
Public Information Officer (PIO)
Joint Cell: PWD / Pune Municipal Corporation
Pune, Maharashtra

Subject: Information under RTI Act 2005 regarding Baner-Pashan Link Road works.

Sir / Madam,
Please provide:
1. Sponsoring public authority and total funds spent on Baner-Pashan Link Road resurfacing.
2. Copy of work sanction order and designated executing authority.
3. Defect liability period and contractor guarantee terms.

Applicant: Priya Kulkarni, Pune, Maharashtra.`,
    priority: 'high'
  };

  // 3. Clarification Case - Land Records (Test 3)
  const test3DocId = 'test_app_land_clarification';
  const test3: Application = {
    id: test3DocId,
    applicationId: 'RTI-2026-000103',
    userId: 'citizen_demo_amit',
    citizenName: 'Amit Patel',
    status: 'submitted',
    createdAt: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
    updatedAt: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),
    submittedAt: new Date(now.getTime() - 12 * 3600 * 1000).toISOString(),

    originalLanguage: 'English',
    originalUserInput: 'I need certified copies of land acquisition notices and mutation entries for agricultural land acquired near the river bridge in Haveli taluka.',
    conversationSummary: 'Citizen is requesting certified copies of land acquisition notices and mutation entries for farmland acquired near river bridge, but has omitted the specific revenue village name and Survey/Gat number.',

    structuredRequirement: {
      subject: 'Land acquisition notices and mutation entry records in Haveli taluka',
      informationRequested: [
        'Certified copy of Section 4 and Section 6 land acquisition notifications',
        'Certified 7/12 extract and mutation entry (Ferfar) prior to and post acquisition',
        'Compensation disbursement schedule and claimant register'
      ],
      location: 'Near river bridge, Haveli taluka',
      state: 'Maharashtra',
      district: 'Pune',
      timePeriod: '2021 - 2024',
      entities: ['Land acquisition', 'Mutation entry', '7/12', 'Haveli taluka'],
      documentsRequested: ['Land acquisition gazette notice', 'Mutation extract']
    },

    recommendedDepartment: 'Revenue & Land Records Department',
    confidenceScore: 0.91,
    alternativeDepartments: [
      { department: 'Water Resources & Sanitation Department', confidence: 0.44, reason: 'Near river bridge / flood margin land' },
      { department: 'Public Works Department (PWD)', confidence: 0.35, reason: 'Bridge project land acquisition' }
    ],
    ambiguity: false,
    humanReviewRequired: false,
    classificationReason: 'Request pertains directly to land acquisition notices, mutation records (Ferfar), and revenue records maintained by the Tehsildar and Sub-Divisional Officer.',
    evidence: ['land acquisition', 'mutation entries', '7/12 extract', 'Haveli taluka', 'compensation'],

    rtiDraft: `To,
Public Information Officer (PIO)
Office of the Tehsildar & Sub-Divisional Magistrate
Haveli Division, Pune, Maharashtra

Subject: RTI Application under Section 6(1) for Land Acquisition & Mutation Records.

Sir / Madam,
Kindly furnish certified copies of:
1. Gazette notification for land acquisition near the river bridge in Haveli taluka.
2. Mutation records reflecting change of ownership.
3. Award copy and compensation list.

Applicant: Amit Patel, Pune, Maharashtra.`,
    priority: 'normal'
  };

  const apps = [test1, test2, test3];

  // 1. Sync to local shared store immediately
  sharedStore.saveApplications(apps);

  sharedStore.addEvent(test1.id, {
    eventId: 'evt_1',
    applicationId: test1.applicationId,
    eventType: 'APPLICATION_SUBMITTED',
    description: 'Application submitted by citizen Rajesh Sharma.',
    actorId: test1.userId,
    actorRole: 'citizen',
    timestamp: test1.submittedAt!,
  });

  sharedStore.addEvent(test2.id, {
    eventId: 'evt_2',
    applicationId: test2.applicationId,
    eventType: 'APPLICATION_SUBMITTED',
    description: 'Application submitted; flagged for routing officer review due to jurisdictional overlap between PWD and Municipal Corporation.',
    actorId: test2.userId,
    actorRole: 'citizen',
    timestamp: test2.submittedAt!,
  });

  sharedStore.addEvent(test3.id, {
    eventId: 'evt_3',
    applicationId: test3.applicationId,
    eventType: 'APPLICATION_SUBMITTED',
    description: 'Application submitted by citizen Amit Patel.',
    actorId: test3.userId,
    actorRole: 'citizen',
    timestamp: test3.submittedAt!,
  });

  // 2. Try writing to Firestore if allowed
  try {
    await setDoc(doc(db, 'applications', test1DocId), test1);
    await setDoc(doc(db, 'applications', test2DocId), test2);
    await setDoc(doc(db, 'applications', test3DocId), test3);
  } catch (err) {
    console.warn('Could not write seed directly to Firestore (permissions), available in shared store:', err);
  }

  createdIds.push(test1.applicationId, test2.applicationId, test3.applicationId);
  return createdIds;
}
