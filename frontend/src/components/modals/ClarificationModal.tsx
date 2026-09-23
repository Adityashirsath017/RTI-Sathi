import { useLanguage } from '@/i18n/LanguageContext';
import React, { useState } from 'react';
import { Application, ClerkProfile } from '@/types';
import { HelpCircle, AlertCircle, X, Loader2, Send, CheckSquare, Square } from 'lucide-react';

interface ClarificationModalProps {
  application: Application;
  clerk: ClerkProfile;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (clarificationInput: {
    question: string;
    category?: string;
    requestedFields?: string[];
    whatIsMissing?: string;
    whatToProvide?: string;
  }) => Promise<void>;
}

export const ClarificationModal: React.FC<ClarificationModalProps> = ({
  application,
  clerk,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useLanguage();
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('Location / Revenue village unclear');
  const [whatIsMissing, setWhatIsMissing] = useState('');
  const [whatToProvide, setWhatToProvide] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'Exact location / village name',
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    'Location / Revenue village unclear',
    'Time period / Financial year missing',
    'Specific public authority ambiguous',
    'Information requested too broad or vague',
    'Survey / Gat / Plot number required',
    'Supporting document / reference missing',
  ];

  const availableFieldOptions = [
    'Exact location / village name',
    'Time period / Financial year',
    'Survey / Gat / Plot number',
    'Project / Scheme / Tender name',
    'Specific document / record title',
    'Department / Authority name',
  ];

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleRequestClarification = async () => {
    if (!question.trim()) {
      setError('Please enter the specific clarification question for the citizen.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onConfirm({
        question: question.trim(),
        category,
        requestedFields: selectedFields,
        whatIsMissing: whatIsMissing.trim() || undefined,
        whatToProvide: whatToProvide.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit clarification request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-orange-50/60 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t('modal.clarify_title', 'Ask Citizen for Clarification')}
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Clarification Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Required Fields / Details to Specify
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableFieldOptions.map((field) => {
                const isChecked = selectedFields.includes(field);
                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => toggleField(field)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors border ${
                      isChecked
                        ? 'bg-orange-50 border-orange-300 text-orange-900 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-orange-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{field}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('modal.what_missing_label', 'What Information is Missing or Incorrect?')}
            </label>
            <input
              type="text"
              value={whatIsMissing}
              onChange={(e) => setWhatIsMissing(e.target.value)}
              placeholder="e.g. Village name and Survey number are not specified"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('modal.clarify_question_label', 'Officer Clarification Message to Citizen')} <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Explain clearly to the citizen what details they need to provide and why it is required for routing."
              rows={4}
              required
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-400"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              The citizen will see this exact message and the requested fields in their dashboard to reply.
            </p>
          </div>

          <div className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <strong>Real-time Sync Note:</strong> The citizen will receive an instant notification in their portal. Once they submit their answers, the AI will reclassify the request and update your queue automatically.
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {t('btn.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleRequestClarification}
            disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {t('modal.btn_confirm_clarify', 'Transmit Question to Citizen')}
          </button>
        </div>
      </div>
    </div>
  );
};
