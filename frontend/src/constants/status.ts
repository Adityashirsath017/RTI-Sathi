import { ApplicationStatus } from '@/types';

export interface StatusConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
}

export const STATUS_MAP: Record<ApplicationStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-300',
    description: 'Application is being prepared by citizen',
  },
  ai_processing: {
    label: 'AI Processing',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    description: 'AI model is analyzing linguistic context and public authorities',
  },
  awaiting_user_confirmation: {
    label: 'Awaiting Citizen Confirmation',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    description: 'Awaiting citizen review of AI extracted requirements',
  },
  submitted: {
    label: 'Submitted — In Queue',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    description: 'Submitted by citizen, waiting for routing officer review',
  },
  human_review_required: {
    label: 'Ambiguous — Review Required',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-400 font-semibold',
    description: 'Jurisdiction overlap detected. Human routing decision required.',
  },
  under_clerk_review: {
    label: 'Under Officer Review',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
    badgeBorder: 'border-cyan-300',
    description: 'Routing officer is actively reviewing this application',
  },
  clarification_required: {
    label: 'Clarification Required',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    badgeBorder: 'border-orange-300',
    description: 'Clarification query sent to citizen, awaiting response',
  },
  resubmitted: {
    label: 'Resubmitted — Citizen Responded',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-300 font-medium',
    description: 'Citizen provided required clarification, ready for re-review',
  },
  approved: {
    label: 'Approved for Routing',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300',
    description: 'Department confirmed by officer, approved for dispatch',
  },
  routed: {
    label: 'Routed to Authority',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    badgeBorder: 'border-emerald-400 font-semibold',
    description: 'Successfully transmitted to the designated public authority',
  },
  closed: {
    label: 'Closed',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-300',
    description: 'Application processing completed and closed',
  },
};

/**
 * Valid state transitions for the Human-in-the-Loop clerk workflow
 */
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ['ai_processing'],
  ai_processing: ['awaiting_user_confirmation', 'submitted', 'human_review_required'],
  awaiting_user_confirmation: ['submitted', 'human_review_required', 'draft'],
  submitted: ['under_clerk_review', 'human_review_required', 'approved', 'clarification_required'],
  human_review_required: ['under_clerk_review', 'approved', 'clarification_required'],
  under_clerk_review: ['approved', 'routed', 'clarification_required', 'human_review_required'],
  clarification_required: ['resubmitted', 'closed'],
  resubmitted: ['under_clerk_review', 'approved', 'clarification_required'],
  approved: ['routed', 'closed'],
  routed: ['closed'],
  closed: [],
};

export function canTransition(current: ApplicationStatus, next: ApplicationStatus): boolean {
  return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
}

export const INDIAN_STATES = [
  'Maharashtra',
  'Delhi (NCT)',
  'Karnataka',
  'Tamil Nadu',
  'Uttar Pradesh',
  'West Bengal',
  'Gujarat',
  'Rajasthan',
  'Kerala',
  'Madhya Pradesh',
  'Bihar',
  'Punjab',
  'Haryana',
  'Telangana',
  'Andhra Pradesh',
  'Odisha',
];

export const COMMON_DEPARTMENTS = [
  'Public Works Department (PWD)',
  'Municipal Corporation / Urban Local Bodies',
  'Water Resources & Sanitation Department',
  'Rural Development & Panchayati Raj',
  'Revenue & Land Records Department',
  'Health & Family Welfare Department',
  'Department of School Education & Literacy',
  'Department of Higher Education',
  'Transport & Motor Vehicles Department',
  'Environment, Forest & Climate Change Department',
  'Food, Civil Supplies & Consumer Protection',
  'Home & Police Department',
];
