import { useLanguage } from '@/i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import { Languages } from 'lucide-react';
import React from 'react';
import { ClerkProfile } from '@/types';
import { NotificationDropdown } from '../common/NotificationDropdown';
import { ShieldCheck, User, LogOut, Menu, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopNavbarProps {
  clerk: ClerkProfile;
  onLogout: () => void;
  onToggleSidebar: () => void;
  onSeedData?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  clerk,
  onLogout,
  onToggleSidebar,
  onSeedData,
}) => {
  const { language, setLanguage, t } = useLanguage();
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-sm font-bold text-lg group-hover:bg-blue-800 transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base">
                  RTI Sathi
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                  Officer Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Centralized Routing & Review System • RTI Black Hole
              </p>
            </div>
          </Link>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Dev Seed Button */}
          {onSeedData && (
            <button
              onClick={onSeedData}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-medium hover:bg-amber-100 transition-colors shadow-2xs"
              title="Seeds 3 realistic test applications (PWD High Confidence, Ambiguous 84% vs 82%, and Clarification) into live Firestore"
            >
              <Database className="w-3.5 h-3.5 text-amber-700" />
              <span>Seed Test Cases (Firestore)</span>
            </button>
          )}

          {/* Language Selector Dropdown */}
          <div className="relative flex items-center">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
              <Languages className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
                title="Select Officer Portal Display Language"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notifications */}
          <NotificationDropdown clerkUid={clerk.uid} />

          {/* Officer Details & Avatar */}
          <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200">
            <Link
              to="/profile"
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-semibold shadow-inner">
                {clerk.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {clerk.name}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {clerk.employeeId} • {clerk.state}
                </div>
              </div>
            </Link>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign Out of Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
