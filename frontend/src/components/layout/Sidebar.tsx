import { useLanguage } from '@/i18n/LanguageContext';
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  AlertTriangle,
  HelpCircle,
  UserCheck,
  CheckCircle2,
  Search,
  History,
  UserCog,
  FileCheck2,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pendingCount?: number;
  ambiguousCount?: number;
  clarificationCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  pendingCount = 0,
  ambiguousCount = 0,
  clarificationCount = 0,
}) => {
  const { t } = useLanguage();
  const navItems = [
    {
      to: '/',
      label: t('nav.dashboard', 'Dashboard'),
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/queue',
      label: t('nav.queue', 'Review Queue'),
      icon: Inbox,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      to: '/ambiguous',
      label: t('nav.ambiguous', 'Ambiguous Cases'),
      icon: AlertTriangle,
      badge: ambiguousCount > 0 ? ambiguousCount : null,
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
    },
    {
      to: '/clarifications',
      label: t('nav.clarifications', 'Clarification Required'),
      icon: HelpCircle,
      badge: clarificationCount > 0 ? clarificationCount : null,
      badgeColor: 'bg-orange-100 text-orange-800',
    },
    {
      to: '/my-reviews',
      label: t('nav.my_reviews', 'My Reviews'),
      icon: UserCheck,
      badge: null,
    },
    {
      to: '/approved',
      label: t('nav.approved', 'Approved & Routed'),
      icon: CheckCircle2,
      badge: null,
    },
    {
      to: '/search',
      label: t('nav.search', 'Search Applications'),
      icon: Search,
      badge: null,
    },
    {
      to: '/audit',
      label: t('nav.audit', 'Audit / Activity Log'),
      icon: History,
      badge: null,
    },
    {
      to: '/profile',
      label: t('nav.profile', 'Officer Profile'),
      icon: UserCog,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {t('nav.routing_nav', 'Routing Navigation')}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      item.badgeColor || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer info card */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-700 font-medium text-xs mb-1">
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            <span>{t('nav.safe_pipeline', 'Audit Safe Pipeline')}</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {t('nav.safe_pipeline_desc', 'All reviews, overrides, and clarifications write immutable audit logs to Firestore.')}
          </p>
        </div>
      </aside>
    </>
  );
};
