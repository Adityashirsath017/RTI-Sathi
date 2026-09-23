import React, { useState, useEffect } from 'react';
import { Application, ClerkProfile } from '@/types';
import { clerkApplicationService } from '@/services/firebase/clerkApplicationService';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Link } from 'react-router-dom';
import { HelpCircle, Clock, ArrowRight, MessageSquare, CheckCircle, RefreshCw } from 'lucide-react';

interface ClarificationQueueProps {
  clerk: ClerkProfile;
}

export const ClarificationQueue: React.FC<ClarificationQueueProps> = ({ clerk }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClarifications = async () => {
    try {
      setLoading(true);
      const apps = await clerkApplicationService.getReviewQueue();
      const filtered = apps.filter(
        (a) => a.status === 'clarification_required' || a.status === 'resubmitted'
      );
      setApplications(filtered);
    } catch (e) {
      console.error('Error fetching clarifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClarifications();

    const unsubscribe = clerkApplicationService.subscribeToQueue((apps) => {
      const filtered = apps.filter(
        (a) => a.status === 'clarification_required' || a.status === 'resubmitted'
      );
      setApplications(filtered);
    });

    return () => unsubscribe();
  }, []);

  const calculateHoursWaiting = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diffMs / (3600 * 1000));
    if (hours < 1) return 'Under 1 hour';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-orange-600" />
            <span>Citizen Clarification Tracker</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Applications awaiting citizen replies or recently resubmitted with updated details
          </p>
        </div>

        <button
          onClick={fetchClarifications}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          Loading clarification cases...
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">
            No active clarification requests pending.
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            When you request clarification on an ambiguous application from the review workspace, it will appear here with live response tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const isResubmitted = app.status === 'resubmitted';
            const clar = app.activeClarification;

            return (
              <div
                key={app.id}
                className={`bg-white rounded-xl border p-4 sm:p-5 shadow-2xs transition-all ${
                  isResubmitted
                    ? 'border-purple-300 ring-2 ring-purple-100 bg-purple-50/20'
                    : 'border-orange-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {app.applicationId}
                    </span>
                    <StatusBadge status={app.status} size="sm" />
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Waiting: {calculateHoursWaiting(clar?.createdAt || app.updatedAt)}
                    </span>
                  </div>

                  <Link
                    to={`/review/${app.applicationId}`}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-2xs transition-colors ${
                      isResubmitted ? 'bg-purple-700 hover:bg-purple-800' : 'bg-slate-900 hover:bg-blue-700'
                    }`}
                  >
                    <span>{isResubmitted ? 'Review Resubmission' : 'Open Review'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="text-sm font-bold text-slate-900 mb-2">
                  {app.structuredRequirement?.subject}
                </div>

                {/* Clarification Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Question Sent by Officer */}
                  <div className="bg-orange-50/80 p-3 rounded-lg border border-orange-200">
                    <div className="text-[10px] font-bold text-orange-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>Clarification Question Sent:</span>
                    </div>
                    <p className="text-slate-800 font-medium leading-relaxed">
                      "{clar?.clarificationQuestion || 'Additional information requested by officer.'}"
                    </p>
                    {clar?.category && (
                      <span className="inline-block mt-2 text-[10px] font-semibold text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded">
                        Category: {clar.category}
                      </span>
                    )}
                  </div>

                  {/* Citizen Status / Response */}
                  <div className={`p-3 rounded-lg border ${
                    isResubmitted
                      ? 'bg-purple-50/80 border-purple-200 text-purple-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1">
                      {isResubmitted ? 'Citizen Clarification Received:' : 'Citizen Response Status:'}
                    </div>
                    {isResubmitted && clar?.citizenResponse ? (
                      <div>
                        <p className="font-semibold text-slate-900 leading-relaxed">
                          "{clar.citizenResponse}"
                        </p>
                        <div className="text-[10px] text-purple-700 mt-2 font-medium">
                          Resubmitted on: {new Date(clar.respondedAt || app.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 italic py-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span>Awaiting citizen response in RTI Sathi app...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
