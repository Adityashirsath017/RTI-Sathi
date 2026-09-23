import React, { useState } from 'react';
import { Application, ClerkProfile } from '@/types';
import { clerkApplicationService } from '@/services/firebase/clerkApplicationService';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, RefreshCw, FileSearch, Building2, MapPin } from 'lucide-react';

interface SearchApplicationsProps {
  clerk: ClerkProfile;
}

export const SearchApplications: React.FC<SearchApplicationsProps> = ({ clerk }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Application[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);
      setSearched(true);
      const data = await clerkApplicationService.getReviewQueue({
        searchQuery: searchTerm.trim(),
      });
      setResults(data);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Search className="w-6 h-6 text-blue-700" />
          <span>Universal Application Search</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Query Firestore records by Application ID, Subject keywords, Citizen identifier, or Department
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              required
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g. RTI-2026-000101, Road construction, Rajesh, Baner, PWD..."
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Execute Search</span>
          </button>
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          Scanning Cloud Firestore database...
        </div>
      ) : searched && results.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileSearch className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">
            No applications match "{searchTerm}".
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try searching by the exact sequence ID (e.g. RTI-2026-000101) or a broader keyword.
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          <div className="p-3 bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
            Found {results.length} matching application{results.length > 1 ? 's' : ''}
          </div>
          {results.map((app) => (
            <div
              key={app.id}
              className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {app.applicationId}
                  </span>
                  <StatusBadge status={app.status} size="sm" />
                  <span className="text-[11px] text-slate-500">
                    Citizen: {app.citizenName || 'Citizen'}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900">
                  {app.structuredRequirement?.subject}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-blue-900">
                    <Building2 className="w-3.5 h-3.5 text-blue-700" />
                    {app.confirmedDepartment || app.recommendedDepartment}
                  </span>
                  {app.structuredRequirement?.district && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {app.structuredRequirement.district}, {app.structuredRequirement.state}
                    </span>
                  )}
                </div>
              </div>

              <Link
                to={`/review/${app.applicationId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition-colors shrink-0 shadow-2xs"
              >
                <span>Open in Review Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
