import React, { useState, useEffect } from 'react';
import { Application, ClerkProfile, QueueFilters } from '@/types';
import { clerkApplicationService } from '@/services/firebase/clerkApplicationService';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfidenceMeter } from '@/components/common/ConfidenceMeter';
import { COMMON_DEPARTMENTS, INDIAN_STATES } from '@/constants/status';
import { Link } from 'react-router-dom';
import {
  Inbox,
  Filter,
  Search,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
} from 'lucide-react';

interface ReviewQueueProps {
  clerk: ClerkProfile;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ clerk }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<QueueFilters>({
    status: 'all',
    department: 'all',
    state: 'all',
    district: 'all',
    language: 'all',
    ambiguousOnly: false,
    assignedToMe: false,
    searchQuery: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const data = await clerkApplicationService.getReviewQueue(filters);
      setApplications(data);
    } catch (e) {
      console.error('Error fetching review queue:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    // Listen for live updates
    const unsubscribe = clerkApplicationService.subscribeToQueue((apps) => {
      // Re-apply current in-memory filters
      let filtered = [...apps];
      if (filters.status && filters.status !== 'all') {
        filtered = filtered.filter((a) => a.status === filters.status);
      }
      if (filters.ambiguousOnly) {
        filtered = filtered.filter((a) => a.humanReviewRequired || a.ambiguity);
      }
      if (filters.department && filters.department !== 'all') {
        filtered = filtered.filter((a) => a.recommendedDepartment === filters.department);
      }
      if (filters.assignedToMe) {
        filtered = filtered.filter((a) => a.assignedClerkId === clerk.uid);
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.applicationId?.toLowerCase().includes(q) ||
            a.structuredRequirement?.subject?.toLowerCase().includes(q) ||
            a.citizenName?.toLowerCase().includes(q)
        );
      }
      // Sort oldest pending first
      filtered.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      setApplications(filtered);
    });

    return () => unsubscribe();
  }, [filters]);

  // Pagination calculation
  const totalPages = Math.ceil(applications.length / pageSize) || 1;
  const paginatedApps = applications.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetFilters = () => {
    setFilters({
      status: 'all',
      department: 'all',
      state: 'all',
      district: 'all',
      language: 'all',
      ambiguousOnly: false,
      assignedToMe: false,
      searchQuery: '',
    });
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Inbox className="w-6 h-6 text-blue-700" />
            <span>Official Review Queue</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active applications in processing pipeline • Sorted by Oldest Pending First (FIFO)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              showFilters
                ? 'bg-blue-50 border-blue-300 text-blue-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>

          <button
            onClick={fetchQueue}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
            title="Refresh queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Search & Fast Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Application ID (e.g. RTI-2026-000101), Subject, Citizen Name..."
              value={filters.searchQuery || ''}
              onChange={(e) => {
                setFilters({ ...filters, searchQuery: e.target.value });
                setCurrentPage(1);
              }}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filters.status || 'all'}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value });
                setCurrentPage(1);
              }}
              className="text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted (In Queue)</option>
              <option value="human_review_required">Ambiguous — Review Required</option>
              <option value="under_clerk_review">Under Officer Review</option>
              <option value="clarification_required">Clarification Required</option>
              <option value="resubmitted">Resubmitted — Citizen Responded</option>
              <option value="approved">Approved</option>
              <option value="routed">Routed</option>
            </select>

            <button
              onClick={() => {
                setFilters({ ...filters, ambiguousOnly: !filters.ambiguousOnly });
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                filters.ambiguousOnly
                  ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Ambiguous Only</span>
            </button>
          </div>
        </div>

        {/* Extended Collapsible Filter Panel */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Target Department</label>
              <select
                value={filters.department || 'all'}
                onChange={(e) => {
                  setFilters({ ...filters, department: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">All Public Authorities</option>
                {COMMON_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">State Jurisdiction</label>
              <select
                value={filters.state || 'all'}
                onChange={(e) => {
                  setFilters({ ...filters, state: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">All States</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Original Language</label>
              <select
                value={filters.language || 'all'}
                onChange={(e) => {
                  setFilters({ ...filters, language: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">All Languages</option>
                <option value="Hindi">Hindi</option>
                <option value="Marathi">Marathi</option>
                <option value="English">English</option>
                <option value="Bengali">Bengali</option>
                <option value="Gujarati">Gujarati</option>
                <option value="Tamil">Tamil</option>
                <option value="Telugu">Telugu</option>
                <option value="Kannada">Kannada</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-300 hover:bg-slate-50 flex-1">
                <input
                  type="checkbox"
                  checked={filters.assignedToMe || false}
                  onChange={(e) => setFilters({ ...filters, assignedToMe: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <span className="text-slate-700 font-medium">Assigned to Me</span>
              </label>

              <button
                onClick={resetFilters}
                className="px-3 py-2 text-slate-500 hover:text-slate-800 underline text-xs font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Application Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Application ID</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4">Citizen</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">AI Recommended Dept</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2 text-xs font-medium">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Loading applications directly from Firestore...</span>
                    </div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-800">
                      No applications are currently waiting for review.
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      All citizen submissions have been routed or there are no pending cases matching your filter criteria.
                    </p>
                    <div className="mt-4">
                      <button
                        onClick={resetFilters}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 font-medium hover:bg-slate-50"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedApps.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    {/* Application ID & Language */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <div>{app.applicationId}</div>
                      {app.originalLanguage && (
                        <span className="text-[10px] font-sans font-normal text-slate-500">
                          Lang: {app.originalLanguage}
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {new Date(app.createdAt).toLocaleDateString([], {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(app.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Citizen */}
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      <div className="font-medium">{app.citizenName || 'Verified Citizen'}</div>
                      <div className="text-[10px] text-slate-400">
                        {app.structuredRequirement?.district || 'General'}
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-slate-900 line-clamp-2">
                        {app.structuredRequirement?.subject || 'RTI Query'}
                      </div>
                      {app.priority === 'high' && (
                        <span className="inline-block mt-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                          Priority Escalation
                        </span>
                      )}
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-blue-900 line-clamp-1">
                        {app.confirmedDepartment || app.recommendedDepartment}
                      </div>
                      {app.override && (
                        <div className="text-[10px] text-amber-700 font-medium">
                          Officer Overridden
                        </div>
                      )}
                    </td>

                    {/* Confidence & Ambiguity */}
                    <td className="py-3.5 px-4 w-32">
                      <ConfidenceMeter
                        score={app.confidenceScore}
                        showLabel={false}
                        size="sm"
                        isAmbiguous={app.ambiguity || app.humanReviewRequired}
                      />
                      {(app.ambiguity || app.humanReviewRequired) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 mt-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Ambiguous
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={app.status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/review/${app.applicationId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-2xs transition-colors"
                      >
                        <span>Review Workspace</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {applications.length > 0 && (
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-800">
                {Math.min(currentPage * pageSize, applications.length)}
              </strong>{' '}
              of <strong className="text-slate-800">{applications.length}</strong> applications
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
