import React, { useState, useEffect } from 'react';
import { Application, ClerkProfile } from '@/types';
import { clerkApplicationService } from '@/services/firebase/clerkApplicationService';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, RefreshCw, ShieldAlert, Sparkles, Building2 } from 'lucide-react';

interface AmbiguousCasesProps {
  clerk: ClerkProfile;
}

export const AmbiguousCases: React.FC<AmbiguousCasesProps> = ({ clerk }) => {
  const [cases, setCases] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAmbiguous = async () => {
    try {
      setLoading(true);
      const apps = await clerkApplicationService.getReviewQueue({ ambiguousOnly: true });
      // Keep only applications needing human review
      const filtered = apps.filter((a) => a.humanReviewRequired || a.ambiguity);
      setCases(filtered);
    } catch (e) {
      console.error('Error fetching ambiguous cases:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmbiguous();

    const unsubscribe = clerkApplicationService.subscribeToQueue((apps) => {
      const filtered = apps.filter((a) => a.humanReviewRequired || a.ambiguity);
      setCases(filtered);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-linear-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-200" />
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Ambiguous Jurisdiction Escalation Queue
              </h1>
            </div>
            <p className="text-xs text-amber-100 max-w-2xl leading-relaxed">
              When AI classifier scores between candidate departments are closely contested (confidence gap &le; 10%), automated routing is suspended. Human Routing Officers must determine the correct public authority.
            </p>
          </div>

          <button
            onClick={fetchAmbiguous}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Grid of Ambiguous Cases */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          Loading ambiguous cases from Firestore...
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">
            No ambiguous cases currently pending.
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            All applications currently in the system have clear departmental jurisdiction or have already been disambiguated.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((app) => {
            const topDept = app.recommendedDepartment;
            const topScore = Math.round(
              app.confidenceScore <= 1.0 ? app.confidenceScore * 100 : app.confidenceScore
            );

            const secondAlt = app.alternativeDepartments?.[0];
            const secondDept = secondAlt ? secondAlt.department : 'Alternative Public Authority';
            const secondScore = secondAlt
              ? Math.round(secondAlt.confidence <= 1.0 ? secondAlt.confidence * 100 : secondAlt.confidence)
              : Math.max(10, topScore - 15);

            const gap = Math.abs(topScore - secondScore);

            return (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-amber-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {app.applicationId}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                        Gap: {gap}%
                      </span>
                      <StatusBadge status={app.status} size="sm" />
                    </div>
                  </div>

                  {/* Subject */}
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-2">
                    {app.structuredRequirement?.subject}
                  </h3>

                  {/* Citizen excerpt */}
                  <p className="text-xs text-slate-500 italic line-clamp-2 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    "{app.originalUserInput}"
                  </p>

                  {/* Conflict Comparison Box */}
                  <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-200/70 space-y-2 mb-4">
                    <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                      Overlapping Authorities Detected:
                    </div>

                    <div className="space-y-1.5">
                      {/* Dept 1 */}
                      <div className="flex items-center justify-between text-xs p-1.5 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-800 truncate pr-2">
                          1. {topDept}
                        </span>
                        <span className="font-black text-emerald-700 shrink-0">
                          {topScore}%
                        </span>
                      </div>

                      {/* Dept 2 */}
                      <div className="flex items-center justify-between text-xs p-1.5 bg-white rounded-lg border border-slate-200">
                        <span className="font-medium text-slate-700 truncate pr-2">
                          2. {secondDept}
                        </span>
                        <span className="font-bold text-amber-700 shrink-0">
                          {secondScore}%
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-amber-900 pt-1 leading-snug">
                      <strong>Reason: </strong> {app.classificationReason || 'Close semantic match across civic and state infrastructure.'}
                    </div>
                  </div>
                </div>

                {/* Footer and Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    {app.structuredRequirement?.district || 'General'}, {app.structuredRequirement?.state}
                  </div>

                  <Link
                    to={`/review/${app.applicationId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs"
                  >
                    <span>Open Review Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
