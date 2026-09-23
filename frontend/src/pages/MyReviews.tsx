import React, { useState, useEffect } from 'react';
import { Application, ClerkProfile } from '@/types';
import { clerkApplicationService } from '@/services/firebase/clerkApplicationService';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Link } from 'react-router-dom';
import { UserCheck, ArrowRight, RefreshCw, CheckCircle2, Shuffle, HelpCircle } from 'lucide-react';

interface MyReviewsProps {
  clerk: ClerkProfile;
}

export const MyReviews: React.FC<MyReviewsProps> = ({ clerk }) => {
  const [reviews, setReviews] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'approved' | 'overridden' | 'clarification'>('all');
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const apps = await clerkApplicationService.getReviewQueue();
      // Filter by current clerk UID
      const myApps = apps.filter(
        (a) => a.reviewedBy === clerk.uid || a.assignedClerkId === clerk.uid
      );
      setReviews(myApps);
    } catch (e) {
      console.error('Error fetching my reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [clerk.uid]);

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'approved') return r.status === 'approved' && !r.override;
    if (filter === 'overridden') return r.override === true;
    if (filter === 'clarification') return r.status === 'clarification_required';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-blue-700" />
            <span>My Review Portfolio</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Applications actively reviewed, approved, or overridden by {clerk.name} ({clerk.employeeId})
          </p>
        </div>

        <button
          onClick={fetchReviews}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Decision Type Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          All My Decisions ({reviews.length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
            filter === 'approved'
              ? 'bg-emerald-700 text-white'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>AI Confirmed</span>
        </button>
        <button
          onClick={() => setFilter('overridden')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
            filter === 'overridden'
              ? 'bg-amber-700 text-white'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Overridden</span>
        </button>
        <button
          onClick={() => setFilter('clarification')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
            filter === 'clarification'
              ? 'bg-orange-700 text-white'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Clarification Requested</span>
        </button>
      </div>

      {/* Review List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          Loading your review records...
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">
            No reviews logged under this filter yet.
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Pick an application from the Review Queue and complete a routing decision to populate your portfolio.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredReviews.map((app) => (
            <div
              key={app.id}
              className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs text-slate-900">
                    {app.applicationId}
                  </span>
                  <StatusBadge status={app.status} size="sm" />
                  {app.override && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Officer Overridden
                    </span>
                  )}
                </div>

                <div className="text-sm font-bold text-slate-800">
                  {app.structuredRequirement?.subject}
                </div>

                <div className="text-xs text-slate-600 flex items-center gap-3">
                  <span>
                    Final Authority: <strong className="text-blue-900">{app.confirmedDepartment || app.recommendedDepartment}</strong>
                  </span>
                  {app.reviewedAt && (
                    <span className="text-slate-400">
                      Reviewed on {new Date(app.reviewedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {app.overrideReason && (
                  <p className="text-xs text-amber-900 bg-amber-50 p-2 rounded-md border border-amber-200 mt-1 italic">
                    Reason: "{app.overrideReason}"
                  </p>
                )}
              </div>

              <Link
                to={`/review/${app.applicationId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors shrink-0"
              >
                <span>View Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
