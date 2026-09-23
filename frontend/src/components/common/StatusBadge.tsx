import { useLanguage } from '@/i18n/LanguageContext';
import React from 'react';
import { ApplicationStatus } from '@/types';
import { STATUS_MAP } from '@/constants/status';

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  const { t } = useLanguage();
  const config = STATUS_MAP[status] || {
    label: status,
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    description: '',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
    lg: 'text-sm font-semibold px-3 py-1.5',
  }[size];

  const dotColorClass = {
    draft: 'bg-slate-400',
    ai_processing: 'bg-indigo-500 animate-pulse',
    awaiting_user_confirmation: 'bg-amber-500',
    submitted: 'bg-blue-500',
    human_review_required: 'bg-amber-600 animate-pulse',
    under_clerk_review: 'bg-cyan-600',
    clarification_required: 'bg-orange-600',
    resubmitted: 'bg-purple-600 animate-bounce',
    approved: 'bg-emerald-600',
    routed: 'bg-emerald-700',
    closed: 'bg-slate-500',
  }[status] || 'bg-slate-400';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder} ${sizeClasses} shadow-sm`}
      title={config.description}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`} />
      )}
      {t(`status.${status}`, config.label)}
    </span>
  );
};
