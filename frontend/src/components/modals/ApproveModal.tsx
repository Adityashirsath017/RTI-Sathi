import { useLanguage } from '@/i18n/LanguageContext';
import { translateDepartment } from '@/services/translationService';
import React, { useState } from 'react';
import { Application, ClerkProfile } from '@/types';
import { CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';

interface ApproveModalProps {
  application: Application;
  clerk: ClerkProfile;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void>;
}

export const ApproveModal: React.FC<ApproveModalProps> = ({
  application,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { language, t } = useLanguage();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetDept = application.confirmedDepartment || application.recommendedDepartment;
  const confidencePercent = Math.round(
    application.confidenceScore <= 1.0 ? application.confidenceScore * 100 : application.confidenceScore
  );

  const handleApprove = async () => {
    try {
      setLoading(true);
      setError(null);
      await onConfirm(notes);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to approve application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t('modal.approve_title', 'Confirm Department Routing')}
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
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="text-xs text-slate-500 font-medium">Designated Public Authority</div>
            <div className="text-sm font-bold text-slate-900">
              {translateDepartment(targetDept, language)}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-500">AI Classification Match:</span>
              <span className="font-semibold text-emerald-700">{confidencePercent}% Confidence</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('modal.dispatch_notes_label', 'Routing Officer Remarks / PIO Instructions (Optional)')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified road jurisdiction under Executive Engineer Pune division."
              rows={3}
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
            />
          </div>

          <div className="text-[11px] text-slate-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Approving will update the status to <strong className="text-blue-900">Approved & Routed</strong>, dispatch the RTI filing slip to the public authority, record an immutable audit event, and notify the citizen.
            </span>
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
            onClick={handleApprove}
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t('modal.btn_confirm_approve', 'Confirm & Route to Authority')}
          </button>
        </div>
      </div>
    </div>
  );
};
