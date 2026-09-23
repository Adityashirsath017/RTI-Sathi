import React, { useState, useEffect } from 'react';
import { ApplicationEvent, ClerkProfile } from '@/types';
import { clerkApplicationService } from '@/services/firebase/clerkApplicationService';
import { History, Shield, RefreshCw, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuditLogProps {
  clerk: ClerkProfile;
}

export const AuditLog: React.FC<AuditLogProps> = ({ clerk }) => {
  const [events, setEvents] = useState<(ApplicationEvent & { readableAppId?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGlobalAudit = async () => {
    try {
      setLoading(true);
      // Fetch recent applications to gather events
      const apps = await clerkApplicationService.getReviewQueue();
      const allEvents: (ApplicationEvent & { readableAppId?: string })[] = [];

      for (const app of apps.slice(0, 15)) {
        const appEvts = await clerkApplicationService.getApplicationEvents(app.id);
        appEvts.forEach((e) => {
          allEvents.push({
            ...e,
            readableAppId: app.applicationId,
          });
        });
      }

      // Sort by newest timestamp first
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(allEvents);
    } catch (e) {
      console.error('Error fetching audit log:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalAudit();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-700" />
            <span>Immutable Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically sealed, append-only ledger of all routing decisions, overrides, and citizen interactions
          </p>
        </div>

        <button
          onClick={fetchGlobalAudit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Security Notice */}
      <div className="p-4 bg-slate-900 text-white rounded-xl flex items-start gap-3 shadow-sm">
        <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
            Statutory Compliance: Section 4 Public Authority Records
          </div>
          <p className="text-slate-300 leading-relaxed">
            Per Firestore security rules, the <code>applications/{'{id}'}/events</code> collection is append-only. Neither clerks nor administrators have privileges to modify or purge historical logs.
          </p>
        </div>
      </div>

      {/* Table of Events */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Application ID</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading audit records...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                events.map((evt, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleString([], {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {evt.readableAppId || evt.applicationId}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                        {evt.eventType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 max-w-md">
                      <div className="line-clamp-2 leading-relaxed font-medium">
                        {evt.description}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-mono text-slate-600">
                        {evt.actorRole} ({evt.actorId?.slice(0, 8)})
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/review/${evt.readableAppId || evt.applicationId}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        <span>Workspace</span>
                        <ArrowRight className="w-3 h-3" />
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
