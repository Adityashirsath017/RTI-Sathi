import { useLanguage } from '@/i18n/LanguageContext';
import { getLocalizedContent, translateDepartment } from '@/services/translationService';
import { Languages } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Application, ClerkProfile, ApplicationEvent, Clarification } from '@/types';
import { clerkApplicationService } from '@/services/firebase/clerkApplicationService';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfidenceMeter } from '@/components/common/ConfidenceMeter';
import { ApproveModal } from '@/components/modals/ApproveModal';
import { OverrideModal } from '@/components/modals/OverrideModal';
import { ClarificationModal } from '@/components/modals/ClarificationModal';
import {
  ArrowLeft,
  CheckCircle2,
  Shuffle,
  HelpCircle,
  Save,
  Clock,
  MapPin,
  AlertTriangle,
  Building2,
  FileText,
  User,
  History,
  ShieldCheck,
  Send,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Lock,
} from 'lucide-react';

interface ReviewWorkspaceProps {
  clerk: ClerkProfile;
}

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({ clerk }) => {
  const { language, t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<Application | null>(null);
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalNotes, setInternalNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [isClarificationOpen, setIsClarificationOpen] = useState(false);

  const loadApplication = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const app = await clerkApplicationService.getApplicationById(id);
      if (app) {
        setApplication(app);
        setInternalNotes(app.internalClerkNotes || '');

        // Fetch subcollections
        const [evts, clars] = await Promise.all([
          clerkApplicationService.getApplicationEvents(app.id),
          clerkApplicationService.getApplicationClarifications(app.id),
        ]);
        setEvents(evts);
        setClarifications(clars);

        // Mark as under_clerk_review if currently submitted or human_review_required
        if (app.status === 'submitted' || app.status === 'human_review_required') {
          clerkApplicationService.startReview(app.id, clerk).catch(console.error);
        }
      }
    } catch (e) {
      console.error('Error loading application:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplication();

    // Set up real-time listener for this application document
    if (id) {
      const unsub = clerkApplicationService.subscribeToApplication(id, async (updatedApp) => {
        if (updatedApp) {
          setApplication(updatedApp);
          if (updatedApp.internalClerkNotes) {
            setInternalNotes(updatedApp.internalClerkNotes);
          }
          if (updatedApp.clarificationHistory) {
            setClarifications(updatedApp.clarificationHistory);
          }
          try {
            const evts = await clerkApplicationService.getApplicationEvents(updatedApp.id);
            setEvents(evts);
          } catch(e) {}
        }
      });
      return () => unsub();
    }
  }, [id]);

  const handleSaveInternalNotes = async () => {
    if (!application) return;
    try {
      setNotesSaving(true);
      await clerkApplicationService.saveInternalNotes(application.id, internalNotes, clerk);
      setActionSuccess('Internal notes saved successfully (visible only to officers).');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert('Failed to save notes: ' + err.message);
    } finally {
      setNotesSaving(false);
    }
  };

  const handleApproveConfirm = async (notes: string) => {
    if (!application) return;
    const targetDept = application.confirmedDepartment || application.recommendedDepartment;
    await clerkApplicationService.approveAndRoute(application.id, targetDept, notes, clerk);
    setActionSuccess(`Application successfully approved and routed to ${targetDept}!`);
    setTimeout(() => {
      loadApplication();
    }, 500);
  };

  const handleOverrideConfirm = async (newDept: string, reason: string) => {
    if (!application) return;
    await clerkApplicationService.overrideDepartment(application.id, newDept, reason, clerk);
    setActionSuccess(`AI recommendation overridden. Application routed to ${newDept}!`);
    setTimeout(() => {
      loadApplication();
    }, 500);
  };

  const handleClarificationConfirm = async (clarificationInput: {
    question: string;
    category?: string;
    requestedFields?: string[];
    whatIsMissing?: string;
    whatToProvide?: string;
  }) => {
    if (!application) return;
    await clerkApplicationService.requestClarification(application.id, clarificationInput, clerk);
    setActionSuccess('Clarification question transmitted to citizen in real-time!');
    setTimeout(() => {
      loadApplication();
    }, 500);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 text-xs">
        Loading application details from Firestore...
      </div>
    );
  }

  if (!application) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <h2 className="text-base font-bold text-slate-800">Application Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">
          No record found matching identifier: <code className="font-mono">{id}</code>
        </p>
        <Link
          to="/queue"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Review Queue</span>
        </Link>
      </div>
    );
  }

  const topDept = application.recommendedDepartment;
  const topConfidence = Math.round(
    application.confidenceScore <= 1.0 ? application.confidenceScore * 100 : application.confidenceScore
  );

  const topAlt = application.alternativeDepartments?.[0];
  const altConfidence = topAlt
    ? Math.round(topAlt.confidence <= 1.0 ? topAlt.confidence * 100 : topAlt.confidence)
    : null;
  const confidenceGap = altConfidence ? Math.abs(topConfidence - altConfidence) : null;
  const isAmbiguous = application.ambiguity || application.humanReviewRequired || (confidenceGap !== null && confidenceGap <= 10);

  const isFinalized = application.status === 'approved' || application.status === 'routed' || application.status === 'closed';

  return (
    <div className="space-y-4">
      {/* Breadcrumb / Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            to="/queue"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            title="Back to Queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-sm text-slate-900">
                {application.applicationId}
              </span>
              <StatusBadge status={application.status} size="sm" />
              {isAmbiguous && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Ambiguity Flagged (Gap: {confidenceGap}%)
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Citizen: <strong className="text-slate-700">{application.citizenName || 'Verified Citizen'}</strong> • Submitted: {new Date(application.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Action Success Toast Banner */}
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-3 py-1.5 rounded-lg font-semibold animate-in fade-in flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
      </div>

      {/* Split Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ======================================================== */}
        {/* LEFT / MAIN PANEL (Cols 1-7) */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. ORIGINAL CITIZEN REQUEST (Untouched, Native Language) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {t('workspace.original_request', '1. Original Citizen Request (Preserved Intact)')}
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                Citizen Language: {application.originalLanguage?.toUpperCase() || 'REGIONAL'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm leading-relaxed text-slate-900 font-medium whitespace-pre-wrap">
              {application.originalUserInput}
            </div>

            <div className="text-[10px] text-slate-400 italic">
              {t('workspace.original_request_desc', "System guarantee: The citizen's native input is immutable and permanently preserved for legal PIO audit.")}
            </div>

            {/* DUAL VIEW: Automatic Translation to Officer Preferred Language */}
            {(application.originalLanguage !== language || application.translations) && (
              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Languages className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t('workspace.translated_request', 'Translated Request (Officer View)')}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                    Officer Language: {language}
                  </span>
                </div>
                <div className="text-sm leading-relaxed text-blue-950 font-medium whitespace-pre-wrap">
                  {getLocalizedContent(application.originalUserInput, application.translations, language)}
                </div>
              </div>
            )}
          </div>

          {/* 2. AI SUMMARY */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                2. AI Conversation Summary
              </h2>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-100 font-normal">
              {application.conversationSummary || 'AI extracted request summary is recorded in the document.'}
            </p>
          </div>

          {/* 3. STRUCTURED REQUIREMENT */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
              <FileText className="w-4 h-4 text-blue-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                3. Structured Information Requirement
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">{t('workspace.subject', 'Subject / Matter:')}</span>
                <div className="font-bold text-slate-900 mt-0.5 text-sm">
                  {getLocalizedContent(application.structuredRequirement?.subject || '', application.subjectTranslations, language)}
                </div>
                {language !== 'en' && application.structuredRequirement?.subject && (
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Original: {application.structuredRequirement?.subject}
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-500 font-medium">Information Requested Points:</span>
                <ul className="mt-1 space-y-1.5 list-disc list-inside text-slate-800">
                  {application.structuredRequirement?.informationRequested?.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Specific Location</span>
                  <span className="font-semibold text-slate-800">
                    {application.structuredRequirement?.location || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">District & State</span>
                  <span className="font-semibold text-slate-800">
                    {application.structuredRequirement?.district || 'General'}, {application.structuredRequirement?.state}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Time Period</span>
                  <span className="font-semibold text-slate-800">
                    {application.structuredRequirement?.timePeriod || 'Recent 3 Years'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. RTI DRAFT */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  4. Formulated Section 6(1) RTI Draft
                </h2>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                RTI Act 2005 Format
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono leading-relaxed text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {application.rtiDraft}
            </div>
          </div>

          {/* 5. CLARIFICATION & RESUBMISSION HISTORY (if applicable) */}
          {(application.activeClarification || clarifications.length > 0) && (
            <div className="bg-white rounded-xl border border-orange-200 shadow-xs p-5">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                <MessageSquare className="w-4 h-4 text-orange-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-orange-900">
                  Clarification & Resubmission History
                </h2>
              </div>

              <div className="space-y-3">
                {clarifications.map((c, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg bg-orange-50/50 border border-orange-200 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-orange-900 font-bold">
                      <span>Officer Inquiry:</span>
                      <span className="font-normal text-slate-500 font-mono">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium">"{c.clarificationQuestion}"</p>
                    {c.requestedFields && c.requestedFields.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.requestedFields.map((f, fIdx) => (
                          <span key={fIdx} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-900 border border-orange-300">
                            Required: {f}
                          </span>
                        ))}
                      </div>
                    )}

                    {c.citizenResponse && (
                      <div className="mt-2 pt-2 border-t border-orange-200 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-purple-900 font-bold">
                          <span>{t('workspace.citizen_reply', 'Citizen Resubmitted Response (Native):')}</span>
                          <span className="font-normal text-slate-500 font-mono">
                            {c.respondedAt ? new Date(c.respondedAt).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="text-purple-950 bg-white p-2.5 rounded border border-purple-200 leading-relaxed font-medium">
                          "{c.citizenResponseOriginal || c.citizenResponse}"
                        </p>

                        {/* Dual View Translated Citizen Response */}
                        {(c.citizenResponseTranslations || c.citizenResponseLanguage !== language) && (
                          <div className="p-2.5 bg-purple-50 rounded border border-purple-200 text-xs text-purple-900">
                            <span className="text-[10px] font-bold uppercase text-purple-700 block mb-0.5">
                              {t('workspace.citizen_reply_translated', 'Citizen Response (Translated into Officer Language):')}
                            </span>
                            <p className="font-semibold text-purple-950">
                              "{getLocalizedContent(c.citizenResponse, c.citizenResponseTranslations, language)}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. IMMUTABLE AUDIT TIMELINE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
              <History className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Immutable Audit Trail ({events.length} Events)
              </h2>
            </div>

            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-2">
                  Initial application logged.
                </div>
              ) : (
                events.map((evt) => (
                  <div key={evt.eventId} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{evt.eventType}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(evt.timestamp).toLocaleString([], {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{evt.description}</p>
                      <div className="text-[10px] text-slate-400">
                        Actor: {evt.actorRole} ({evt.actorId.slice(0, 8)})
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT / SIDE PANEL (Cols 8-12) */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-4 sticky top-20">
          {/* AI DEPARTMENT CLASSIFICATION & CONFIDENCE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-700" />
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    AI Recommended Authority
                  </h3>
                  {application.classificationVersion && application.classificationVersion > 1 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                      v{application.classificationVersion} (Reclassified)
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {topConfidence}% Match
              </span>
            </div>

            {/* Recommended Department Card */}
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
              <div className="text-xs text-blue-800 font-semibold mb-1">
                Top Authority Match
              </div>
              <div className="text-sm font-black text-blue-950">
                {topDept}
              </div>
              <div className="mt-2.5">
                <ConfidenceMeter score={application.confidenceScore} isAmbiguous={isAmbiguous} gap={confidenceGap || undefined} />
              </div>
            </div>

            {/* AI Explanation / Evidence */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-700">Classification Reasoning:</span>
              <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed text-[11px]">
                {application.classificationReason || 'Request matches department service categories and statutory mandate.'}
              </p>
            </div>

            {/* Evidence Detected */}
            {application.evidence && application.evidence.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Evidence Keywords Detected:
                </span>
                <div className="flex flex-wrap gap-1">
                  {application.evidence.map((ev, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative Departments */}
            {application.alternativeDepartments && application.alternativeDepartments.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-slate-700">
                  Alternative Authorities Considered:
                </span>
                <div className="space-y-1.5">
                  {application.alternativeDepartments.map((alt, idx) => {
                    const score = Math.round(alt.confidence <= 1.0 ? alt.confidence * 100 : alt.confidence);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-medium text-slate-800 truncate">{alt.department}</div>
                          {alt.reason && (
                            <div className="text-[10px] text-slate-500 truncate">{alt.reason}</div>
                          )}
                        </div>
                        <span className="font-bold text-slate-700 shrink-0">{score}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* AMBIGUITY DETECTION BANNER (If gap <= 10% or ambiguity flagged) */}
          {isAmbiguous && (
            <div className="bg-amber-50 rounded-xl border border-amber-300 p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Ambiguous Jurisdiction Detected</span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed font-medium">
                The classification scores between the top departments are close (Gap: <strong>{confidenceGap}%</strong>). This request falls under potential overlapping jurisdiction.
              </p>
              <div className="p-2 bg-white/80 rounded border border-amber-200 text-[11px] text-amber-900 font-bold">
                HUMAN REVIEW MANDATORY: Please review facts and confirm or override the final authority.
              </div>
            </div>
          )}

          {/* PRIVATE CLERK NOTES (Protected from citizen) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Private Officer Notes</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Invisible to Citizen
              </span>
            </div>

            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="e.g. Verified with Sub-Division road register. Municipal boundary begins 200m after toll plaza."
              rows={3}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <button
              onClick={handleSaveInternalNotes}
              disabled={notesSaving}
              className="w-full py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>{notesSaving ? 'Saving Notes...' : 'Save Private Notes'}</span>
            </button>
          </div>

          {/* CLERK DECISION ACTIONS BAR */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1.5">
              Routing Officer Decision
            </div>

            {isFinalized ? (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Decision Finalized</span>
                </div>
                <div>Routed to: <strong>{application.confirmedDepartment || application.finalDepartment}</strong></div>
                <div className="text-[10px] text-emerald-700">
                  Reviewed by Officer on {application.reviewedAt ? new Date(application.reviewedAt).toLocaleString() : ''}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* 1. Approve & Route */}
                <button
                  onClick={() => setIsApproveOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Route to {topDept.split('(')[0].trim()}</span>
                </button>

                {/* 2. Override Department */}
                <button
                  onClick={() => setIsOverrideOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Override Department (Clerk Discretion)</span>
                </button>

                {/* 3. Request Clarification */}
                <button
                  onClick={() => setIsClarificationOpen(true)}
                  className="w-full py-2 px-4 rounded-xl border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-900 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <HelpCircle className="w-4 h-4 text-orange-700" />
                  <span>Request Clarification from Citizen</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ApproveModal
        application={application}
        clerk={clerk}
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={handleApproveConfirm}
      />

      <OverrideModal
        application={application}
        clerk={clerk}
        isOpen={isOverrideOpen}
        onClose={() => setIsOverrideOpen(false)}
        onConfirm={handleOverrideConfirm}
      />

      <ClarificationModal
        application={application}
        clerk={clerk}
        isOpen={isClarificationOpen}
        onClose={() => setIsClarificationOpen(false)}
        onConfirm={handleClarificationConfirm}
      />
    </div>
  );
};
