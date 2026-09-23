import { useLanguage } from '@/i18n/LanguageContext';
import { translateDepartment } from '@/services/translationService';
import React, { useState, useEffect } from 'react';
import { Application, ClerkProfile, DepartmentInfo } from '@/types';
import { departmentService } from '@/services/firebase/departmentService';
import { Shuffle, AlertTriangle, X, Loader2, Search } from 'lucide-react';

interface OverrideModalProps {
  application: Application;
  clerk: ClerkProfile;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newDept: string, reason: string) => Promise<void>;
}

export const OverrideModal: React.FC<OverrideModalProps> = ({
  application,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { language, t } = useLanguage();
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    departmentService.getDepartments().then((list) => {
      setDepartments(list);
      // Preselect alternative if available
      if (application.alternativeDepartments && application.alternativeDepartments.length > 0) {
        setSelectedDept(application.alternativeDepartments[0].department);
      } else if (list.length > 0) {
        setSelectedDept(list[0].name);
      }
    });
  }, [application]);

  if (!isOpen) return null;

  const filteredDepts = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase()) ||
    d.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleOverride = async () => {
    if (!selectedDept) {
      setError('Please select the correct public authority.');
      return;
    }
    if (!reason.trim()) {
      setError('A justification reason is mandatory when overriding AI classification.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onConfirm(selectedDept, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to override department.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Override AI Department Recommendation
              </h3>
              <p className="text-xs text-slate-500">
                Application: <span className="font-mono font-semibold">{application.applicationId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current AI Recommendation */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="text-slate-500 font-medium">Original AI Recommendation:</div>
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span>{application.recommendedDepartment}</span>
              <span className="text-slate-500 font-normal">
                {Math.round(application.confidenceScore <= 1 ? application.confidenceScore * 100 : application.confidenceScore)}% Confidence
              </span>
            </div>
          </div>

          {/* Search and Select Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Correct Public Authority <span className="text-rose-500">*</span>
            </label>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search departments by name, code or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {filteredDepts.map((d) => (
                <label
                  key={d.departmentId}
                  className={`flex items-start gap-2.5 p-2.5 cursor-pointer text-xs transition-colors ${
                    selectedDept === d.name ? 'bg-blue-50 text-blue-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="override_dept"
                    value={d.name}
                    checked={selectedDept === d.name}
                    onChange={() => setSelectedDept(d.name)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{d.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-mono font-normal">
                        {d.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {d.jurisdictionNotes || d.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Mandatory Override Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Officer Justification Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Application concerns an internal municipal ward link road rather than a state highway, falling under ULB jurisdiction."
              rows={3}
              required
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder-slate-400"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              This reason will be recorded in the immutable audit log and reviewed during department quality audits.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {t('btn.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleOverride}
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Override & Route
          </button>
        </div>
      </div>
    </div>
  );
};
