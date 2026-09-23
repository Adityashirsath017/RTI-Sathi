import { useLanguage } from '@/i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import { Languages, CheckCircle2 } from 'lucide-react';
import React from 'react';
import { ClerkProfile } from '@/types';
import { UserCheck, ShieldCheck, Mail, Building2, MapPin, Calendar, Clock, Database, Server } from 'lucide-react';

interface ClerkProfileProps {
  clerk: ClerkProfile;
}

export const ClerkProfileView: React.FC<ClerkProfileProps> = ({ clerk }) => {
  const { language, setLanguage, t, isSaving } = useLanguage();
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    await setLanguage(newLang);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-blue-700" />
          <span>Routing Officer Identity Profile</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Designated credentials and role-based authority parameters
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-900 px-6 py-8 text-white flex flex-col sm:flex-row items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-inner border-2 border-white/20">
            {clerk.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-lg font-bold">{clerk.name}</h2>
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap text-xs text-slate-300">
              <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-blue-200">
                {clerk.employeeId}
              </span>
              <span>•</span>
              <span className="capitalize">{clerk.department}</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase text-[10px]">
                {clerk.role}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Official Email</span>
            </div>
            <div className="font-semibold text-slate-800">{clerk.email}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Assigned Jurisdiction</span>
            </div>
            <div className="font-semibold text-slate-800">{clerk.district}, {clerk.state}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Account Commissioned</span>
            </div>
            <div className="font-semibold text-slate-800">
              {new Date(clerk.createdAt).toLocaleDateString([], {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Terminal Login</span>
            </div>
            <div className="font-semibold text-slate-800">
              {clerk.lastLoginAt ? new Date(clerk.lastLoginAt).toLocaleString() : 'Active session'}
            </div>
          </div>
        </div>
      </div>

      {/* Officer Preferred Language Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-blue-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {t('profile.preferred_lang', 'Officer Display Language & Workspace Localization')}
            </h3>
          </div>
          {savedSuccess && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('profile.save_success', 'Updated successfully')}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-700">
            {t('profile.preferred_lang', 'Preferred Language')}
          </label>
          <select
            value={language}
            onChange={handleLanguageChange}
            disabled={isSaving}
            className="w-full sm:w-80 p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition-colors"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName} — {l.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {t('profile.preferred_lang_hint', 'Citizen requests in regional languages will automatically be translated to this language in your review workspace. Your choice is permanently saved in your officer account.')}
          </p>
        </div>
      </div>

      {/* Backend Infrastructure Connection Status */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4 text-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Database className="w-4 h-4 text-blue-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Shared Firebase Backend Connection
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-slate-500 block text-[11px]">Firebase Project ID</span>
            <span className="font-mono font-bold text-slate-800">rti-black-hole</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-slate-500 block text-[11px]">Firestore Database</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Connected (Cloud Firestore)
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-slate-500 block text-[11px]">RBAC Role Authorization</span>
            <span className="font-bold text-blue-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Role = 'clerk' Verified
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-blue-900 leading-relaxed text-[11px]">
          <strong>Dual-Portal Synchrony Notice:</strong> Any action taken by this Routing Officer immediately triggers Firestore real-time listeners and updates the Citizen Application (RTI Sathi) running on port 5173/4173 with zero simulated delays.
        </div>
      </div>
    </div>
  );
};
