import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { ScanRun } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ScanStatusBadge } from '../components/scans/ScanStatusBadge';
import { parseApiError } from '../lib/utils';
import { 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  ArrowRight, 
  Filter
} from 'lucide-react';

export const ScansPage: React.FC = () => {
  const [scans, setScans] = useState<ScanRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchScans = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      let endpoint = '/api/v1/scan-runs?limit=50';
      if (statusFilter !== 'all') {
        endpoint += `&status=${statusFilter}`;
      }
      const data = await api.get<ScanRun[]>(endpoint);
      setScans(data || []);
    } catch (err: any) {
      setError(parseApiError(err, 'Failed to load scan runs'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const formatDuration = (start: string, end?: string | null) => {
    if (!end) return 'In progress';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diffSeconds = Math.max(0, Math.round((e - s) / 1000));
    if (diffSeconds < 60) return `${diffSeconds}s`;
    const minutes = Math.floor(diffSeconds / 60);
    const remainingSeconds = diffSeconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-800/60 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
              Execution Observability
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl font-sans">
            Scan History
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Audit logs and crawler execution metrics for your active watch profiles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchScans(true)}
            disabled={refreshing}
            className="flex items-center gap-2 border-slate-800 text-slate-300 hover:text-white"
            aria-label="Refresh scan history"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
          <div className="flex flex-wrap gap-1.5 font-mono">
            {['all', 'completed', 'partial', 'failed', 'running'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  statusFilter === s
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-950/60 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
                aria-pressed={statusFilter === s}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs font-mono text-slate-400">
          Showing <span className="font-bold text-cyan-400">{scans.length}</span> scans
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading scan runs">
          <Spinner className="h-8 w-8 text-cyan-400" />
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 rounded-xl bg-red-950/20 border border-red-500/30 text-red-200" role="alert">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <h2 className="text-base font-semibold text-white">Failed to Load Scan History</h2>
          </div>
          <p className="mt-2 text-xs font-mono text-red-300/80">{error}</p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => fetchScans()} className="border-red-500/40 text-red-200 hover:bg-red-950/40 text-xs">
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && scans.length === 0 && (
        <Card className="border-slate-800/80 bg-slate-900/60">
          <CardContent className="py-14 text-center">
            <Activity className="mx-auto h-12 w-12 text-slate-600 mb-3" />
            <h2 className="text-base font-semibold text-white">No Scan Runs Found</h2>
            <p className="text-xs font-mono text-slate-400 mt-1 max-w-md mx-auto">
              {statusFilter !== 'all' 
                ? `No scans matching filter "${statusFilter}". Try selecting "All" to view all records.`
                : 'No automated scan runs have been logged for your watch profiles yet. Scans run automatically on schedule.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Scan Runs List */}
      {!loading && !error && scans.length > 0 && (
        <div className="space-y-3">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden bg-slate-900/70 border border-slate-800/80 rounded-xl shadow-lg backdrop-blur-sm">
            <table className="min-w-full divide-y divide-slate-800/80 text-sm">
              <thead className="bg-slate-950/60 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-left">Scan ID / Status</th>
                  <th scope="col" className="px-4 py-3.5 text-left">Watch Profile</th>
                  <th scope="col" className="px-4 py-3.5 text-left">Started / Duration</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Companies</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Discovered</th>
                  <th scope="col" className="px-4 py-3.5 text-center">New Jobs</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Matched</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Errors</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-transparent font-mono text-xs">
                {scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ScanStatusBadge status={scan.status} />
                        <code className="text-xs text-cyan-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded font-mono">
                          {scan.id.substring(0, 8)}
                        </code>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-white font-sans">{scan.watch_profile_name || 'System Profile'}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-300">
                      <div>{new Date(scan.started_at).toLocaleString()}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{formatDuration(scan.started_at, scan.completed_at)}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center text-slate-300">
                      {scan.companies_checked}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center font-semibold text-white">
                      {scan.jobs_discovered}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center font-semibold text-cyan-400">
                      {scan.jobs_new}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center font-semibold text-emerald-400">
                      {scan.jobs_matched}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className={`inline-block font-bold px-2 py-0.5 rounded-full text-[11px] ${
                        scan.error_count > 0 ? 'bg-red-950/60 border border-red-500/40 text-red-400' : 'bg-slate-950 border border-slate-800 text-slate-400'
                      }`}>
                        {scan.error_count}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <Link
                        to={`/dashboard/scans/${scan.id}`}
                        className="inline-flex items-center font-medium text-cyan-400 hover:text-cyan-300 font-sans"
                        aria-label={`View details for scan ${scan.id.substring(0, 8)}`}
                      >
                        Details <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {scans.map((scan) => (
              <Card key={scan.id} className="border-slate-800/80 bg-slate-900/70">
                <CardContent className="p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <ScanStatusBadge status={scan.status} />
                    <code className="text-xs text-cyan-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded">
                      {scan.id.substring(0, 8)}
                    </code>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Watch Profile</span>
                    <p className="text-sm font-semibold text-white font-sans">{scan.watch_profile_name || 'Active Profile'}</p>
                  </div>

                  <div className="text-slate-400 flex justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                    <span>Started: {new Date(scan.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>Duration: {formatDuration(scan.started_at, scan.completed_at)}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 text-center">
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/40">
                      <span className="text-[10px] text-slate-500 block">Checked</span>
                      <span className="text-xs font-bold text-white">{scan.companies_checked}</span>
                    </div>
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/40">
                      <span className="text-[10px] text-slate-500 block">Found</span>
                      <span className="text-xs font-bold text-white">{scan.jobs_discovered}</span>
                    </div>
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/40">
                      <span className="text-[10px] text-slate-500 block">New</span>
                      <span className="text-xs font-bold text-cyan-400">{scan.jobs_new}</span>
                    </div>
                    <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/40">
                      <span className="text-[10px] text-slate-500 block">Errors</span>
                      <span className={`text-xs font-bold ${scan.error_count > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {scan.error_count}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      to={`/dashboard/scans/${scan.id}`}
                      className="w-full inline-flex justify-center items-center py-2 text-xs font-semibold text-slate-950 bg-cyan-500 hover:bg-cyan-400 rounded-xl transition-colors shadow-sm"
                    >
                      View Scan Details <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScansPage;
