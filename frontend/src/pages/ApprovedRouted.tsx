import React, { useState, useEffect } from 'react';
import { Application, ClerkProfile } from '@/types';
import { clerkApplicationService } from '@/services/firebase/clerkApplicationService';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, RefreshCw, Send, FileCheck } from 'lucide-react';

interface ApprovedRoutedProps {
  clerk: ClerkProfile;
}

export const ApprovedRouted: React.FC<ApprovedRoutedProps> = ({ clerk }) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApproved = async () => {
    try {
      setLoading(true);
      const apps = await clerkApplicationService.getReviewQueue();
      const approved = apps.filter((a) => a.status === 'approved' || a.status === 'routed');
      setApplications(approved);
    } catch (e) {
      console.error('Error fetching approved applications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApproved();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <span>Approved & Routed Applications</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Permanent repository of verified RTI applications dispatched to designated Public Authorities
          </p>
        </div>

        <button
          onClick={fetchApproved}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Application ID</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Final Public Authority</th>
                <th className="py-3 px-4">Decision Type</th>
                <th className="py-3 px-4">Approved Date</th>
                <th className="py-3 px-4">Routing Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading approved records from Firestore...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-800">
                      No applications have been approved yet.
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Review pending applications in your queue and click "Approve & Route" to populate this official dispatch ledger.
                    </p>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {app.applicationId}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 line-clamp-1">
                        {app.structuredRequirement?.subject}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-blue-900 line-clamp-1">
                        {app.confirmedDepartment || app.recommendedDepartment}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {app.override ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Clerk Override
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          AI Confirmed
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(app.approvedAt || app.updatedAt).toLocaleDateString([], {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={app.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/review/${app.applicationId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
                      >
                        <span>View Slip</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
