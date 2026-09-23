import React, { useState, useEffect } from 'react';
import { ClerkProfile, Application, DashboardStats } from '@/types';
import { clerkApplicationService } from '@/services/firebase/clerkApplicationService';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfidenceMeter } from '@/components/common/ConfidenceMeter';
import { Link } from 'react-router-dom';
import {
  Inbox,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Send,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  MapPin,
  RefreshCw,
  Search,
} from 'lucide-react';

interface DashboardHomeProps {
  clerk: ClerkProfile;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ clerk }) => {
  const [stats, setStats] = useState<DashboardStats>({
    pendingReviews: 0,
    ambiguousCases: 0,
    clarificationRequired: 0,
    approvedToday: 0,
    routedToday: 0,
    totalReviewed: 0,
  });
  const [pendingQueue, setPendingQueue] = useState<Application[]>([]);
  const [ambiguousFeed, setAmbiguousFeed] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedStats, allApps] = await Promise.all([
        clerkApplicationService.getDashboardStats(),
        clerkApplicationService.getReviewQueue(),
      ]);

      setStats(fetchedStats);

      // Pending queue (FIFO: oldest first)
      const pending = allApps.filter((a) =>
        ['submitted', 'human_review_required', 'under_clerk_review', 'resubmitted'].includes(a.status)
      );
      setPendingQueue(pending.slice(0, 5));

      // Ambiguous feed
      const ambiguous = allApps.filter((a) => a.humanReviewRequired || a.ambiguity);
      setAmbiguousFeed(ambiguous.slice(0, 4));
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Set up real-time listener for queue changes
    const unsubscribe = clerkApplicationService.subscribeToQueue((apps) => {
      const pending = apps.filter((a) =>
        ['submitted', 'human_review_required', 'under_clerk_review', 'resubmitted'].includes(a.status)
      );
      setPendingQueue(pending.slice(0, 5));
      setAmbiguousFeed(apps.filter((a) => a.humanReviewRequired || a.ambiguity).slice(0, 4));
      
      // Update quick counts
      clerkApplicationService.getDashboardStats().then(setStats).catch(() => {});
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Routing Operations Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Welcome back, <strong className="text-slate-800">{clerk.name}</strong> ({clerk.employeeId}) • Division: {clerk.department}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Counts</span>
          </button>
          <Link
            to="/queue"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <span>Open Review Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Pending Reviews */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pending Reviews
            </span>
            <Inbox className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.pendingReviews}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>FIFO Oldest First</span>
          </div>
        </div>

        {/* Ambiguous Cases */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Ambiguous Cases
            </span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-900">
            {stats.ambiguousCases}
          </div>
          <div className="text-[10px] text-amber-700 mt-1">
            Overlapping Jurisdiction
          </div>
        </div>

        {/* Clarification Required */}
        <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-2xs">
          <div className="flex items-center justify-between text-orange-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Clarifications
            </span>
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.clarificationRequired}
          </div>
          <div className="text-[10px] text-orange-700 mt-1">
            Waiting for Citizen
          </div>
        </div>

        {/* Approved Today */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Approved Today
            </span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-800">
            {stats.approvedToday}
          </div>
          <div className="text-[10px] text-emerald-600 mt-1 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> Verified by Officer
          </div>
        </div>

        {/* Routed Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Routed Today
            </span>
            <Send className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.routedToday}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Transmitted to PIO
          </div>
        </div>

        {/* Total Reviewed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Reviewed
            </span>
            <FileText className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.totalReviewed}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            All historical reviews
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Queue & Ambiguity Watch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Oldest Urgent Cases waiting for review */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Priority Review Queue (Oldest Pending First)
              </h2>
            </div>
            <Link
              to="/queue"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              View Full Queue →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingQueue.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-700">
                  No applications are currently waiting for review.
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Queue is up-to-date! Click "Seed Test Cases (Firestore)" in the top bar to inject real test applications.
                </p>
              </div>
            ) : (
              pendingQueue.map((app) => (
                <div
                  key={app.id}
                  className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {app.applicationId}
                      </span>
                      <StatusBadge status={app.status} size="sm" />
                      {app.originalLanguage && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                          {app.originalLanguage}
                        </span>
                      )}
                      {app.priority === 'high' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold uppercase">
                          High Priority
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                      {app.structuredRequirement?.subject || 'RTI Application'}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="text-blue-700 font-medium truncate max-w-xs">
                        Target: {app.recommendedDepartment}
                      </span>
                      {app.structuredRequirement?.district && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {app.structuredRequirement.district}, {app.structuredRequirement.state}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-24 hidden sm:block">
                      <ConfidenceMeter score={app.confidenceScore} showLabel={false} size="sm" />
                    </div>
                    <Link
                      to={`/review/${app.applicationId}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Ambiguous Jurisdiction Watch */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-amber-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Ambiguous Jurisdiction Feed</span>
            </div>
            <Link
              to="/ambiguous"
              className="text-xs font-semibold text-amber-800 hover:underline"
            >
              See All →
            </Link>
          </div>

          <div className="p-4 divide-y divide-slate-100 flex-1 overflow-y-auto">
            {ambiguousFeed.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No ambiguous cases currently flagged by AI classifier.
              </div>
            ) : (
              ambiguousFeed.map((app) => {
                const topAlt = app.alternativeDepartments?.[0];
                const topScore = Math.round(app.confidenceScore <= 1 ? app.confidenceScore * 100 : app.confidenceScore);
                const altScore = topAlt ? Math.round(topAlt.confidence <= 1 ? topAlt.confidence * 100 : topAlt.confidence) : null;
                const gap = altScore ? Math.abs(topScore - altScore) : null;

                return (
                  <div key={app.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-800">
                        {app.applicationId}
                      </span>
                      {gap !== null && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Gap: {gap}%
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 font-medium line-clamp-2">
                      {app.structuredRequirement?.subject}
                    </p>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="truncate pr-2 font-medium">1. {app.recommendedDepartment}</span>
                        <span className="font-bold text-emerald-700">{topScore}%</span>
                      </div>
                      {topAlt && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="truncate pr-2">2. {topAlt.department}</span>
                          <span className="font-bold text-amber-700">{altScore}%</span>
                        </div>
                      )}
                    </div>

                    <Link
                      to={`/review/${app.applicationId}`}
                      className="block text-center text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline pt-1"
                    >
                      Resolve Jurisdiction Conflict →
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
