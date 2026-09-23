export type UserRole = 'citizen' | 'clerk' | 'admin';

export interface ClerkProfile {
  preferredLanguage?: string;
  uid: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
  state: string;
  district: string;
  role: 'clerk' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type ApplicationStatus =
  | 'draft'
  | 'ai_processing'
  | 'awaiting_user_confirmation'
  | 'submitted'
  | 'human_review_required'
  | 'under_clerk_review'
  | 'clarification_required'
  | 'resubmitted'
  | 'approved'
  | 'routed'
  | 'closed';

export interface StructuredRequirement {
  subject: string;
  informationRequested: string[];
  location?: string;
  state?: string;
  district?: string;
  timePeriod?: string;
  entities?: string[];
  documentsRequested?: string[];
}

export interface DepartmentAlternative {
  department: string;
  confidence: number;
  reason?: string;
}

export interface DepartmentClassification {
  primaryDepartment: string;
  confidence: number; // 0.0 - 1.0
  alternatives: DepartmentAlternative[];
  ambiguity: boolean;
  humanReviewRequired: boolean;
  reason: string;
  evidence: string[];
  reasoningSummary?: string;
  classificationVersion?: number;
  classificationHistory?: ClassificationRecord[];
  clarificationHistory?: Clarification[];
}

export interface RTIDraft {
  toAuthority: string;
  addressLines: string[];
  subject: string;
  points: string[];
  applicantInfo: {
    name: string;
    address?: string;
    contact?: string;
  };
  actReference: string;
  feeDeclaration: string;
  formattedText: string;
}

export interface Clarification {
  clarificationId: string;
  applicationId: string;
  clarificationQuestion: string;
  clarificationMessage?: string;
  category?: string;
  reason?: string;
  requestedFields?: string[];
  whatIsMissing?: string;
  whatToProvide?: string;
  whatIsMissingTranslations?: Record<string, string>;
  whatToProvideTranslations?: Record<string, string>;
  originalText?: string;
  originalLanguage?: string;
  translations?: Record<string, string>;
  citizenResponseOriginal?: string;
  citizenResponseLanguage?: string;
  citizenResponseTranslations?: Record<string, string>;
  createdBy: string;
  requestedBy?: string;
  createdAt: string;
  requestedAt?: string;
  citizenResponse?: string;
  respondedAt?: string;
  status: 'pending' | 'resolved';
}

export interface ClassificationRecord {
  version: number;
  recommendedDepartment: string;
  confidenceScore: number;
  confidenceGap?: number;
  alternativeDepartments?: DepartmentAlternative[];
  ambiguity: boolean;
  ambiguityReason?: string;
  humanReviewRequired: boolean;
  classificationReason?: string;
  evidence: string[];
  reasoningSummary?: string;
  createdAt: string;
}

export type AuditEventType =
  | 'APPLICATION_CREATED'
  | 'AI_ANALYSIS_STARTED'
  | 'AI_ANALYSIS_COMPLETED'
  | 'USER_CONFIRMED_DEPARTMENT'
  | 'USER_UPDATED_REQUIREMENT'
  | 'RTI_DRAFT_GENERATED'
  | 'APPLICATION_SUBMITTED'
  | 'CLERK_REVIEW_STARTED'
  | 'DEPARTMENT_APPROVED'
  | 'DEPARTMENT_OVERRIDDEN'
  | 'CLARIFICATION_REQUESTED'
  | 'USER_RESPONDED_TO_CLARIFICATION'
  | 'CLERK_APPROVED_AND_ROUTED'
  | 'STATUS_CHANGED'
  | 'INTERNAL_NOTE_ADDED';

export interface ApplicationEvent {
  eventId: string;
  applicationId: string;
  eventType: AuditEventType;
  description: string;
  metadata?: Record<string, any>;
  actorId: string;
  actorRole: UserRole | 'system';
  timestamp: string;
}

export interface Application {
  id: string; // Internal / Firestore document ID
  applicationId: string; // Readable ID (e.g. RTI-2026-000101)
  userId: string;
  citizenName?: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;

  // Preserved User Inputs
  originalLanguage: string;
  originalUserInput: string; // NEVER OVERWRITTEN
  conversationSummary?: string;

  // Structured Requirements
  structuredRequirement: StructuredRequirement;
  finalUserApprovedRequirement?: StructuredRequirement;

  // AI Classification
  recommendedDepartment: string;
  confidenceScore: number;
  confidenceGap?: number;
  alternativeDepartments: DepartmentAlternative[];
  ambiguity: boolean;
  ambiguityReason?: string;
  humanReviewRequired: boolean;
  classificationReason: string;
  reasoningSummary?: string;
  evidence: string[];

  // Versioning and History
  classificationVersion?: number;
  classificationHistory?: ClassificationRecord[];
  clarificationHistory?: Clarification[];

  // RTI Draft
  rtiDraft: string;

  // Routing Officer Fields
  assignedClerkId?: string;
  assignedClerkName?: string;
  assignedAt?: string;
  confirmedDepartment?: string;
  clerkSelectedDepartment?: string;
  finalDepartment?: string;
  override?: boolean;
  overrideReason?: string;
  decisionType?: 'AI_CONFIRMED' | 'CLERK_OVERRIDE' | 'CLERK_APPROVED';
  clerkNotes?: string;
  internalClerkNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedAt?: string;
  routedAt?: string;
  priority?: 'normal' | 'urgent' | 'high';

  // Multilingual translations
  translations?: Record<string, string>;
  subjectTranslations?: Record<string, string>;
  overrideReasonTranslations?: Record<string, string>;
  clerkNotesTranslations?: Record<string, string>;

  // Clarifications
  activeClarification?: Clarification;
}

export interface DepartmentInfo {
  departmentId: string;
  code: string;
  name: string;
  nameLocal?: Record<string, string>;
  state?: string;
  district?: string;
  description: string;
  domains: string[];
  keywords: string[];
  jurisdictionNotes: string;
  alternativeAuthorities: string[];
}

export interface Notification {
  notificationId: string;
  userId: string;
  applicationId?: string;
  type: string;
  title: string;
  message: string;
  titleTranslations?: Record<string, string>;
  messageTranslations?: Record<string, string>;
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  pendingReviews: number;
  ambiguousCases: number;
  clarificationRequired: number;
  approvedToday: number;
  routedToday: number;
  totalReviewed: number;
}

export interface QueueFilters {
  status?: string;
  department?: string;
  state?: string;
  district?: string;
  language?: string;
  ambiguousOnly?: boolean;
  clarificationOnly?: boolean;
  assignedToMe?: boolean;
  searchQuery?: string;
}
