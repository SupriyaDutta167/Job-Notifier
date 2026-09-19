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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Scan History</h1>
          <p className="text-sm text-gray-500">
            Audit logs and crawler execution metrics for your active watch profiles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchScans(true)}
            disabled={refreshing}
            className="flex items-center gap-2"
            aria-label="Refresh scan history"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Status:</span>
          <div className="flex flex-wrap gap-1.5">
            {['all', 'completed', 'partial', 'failed', 'running'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-pressed={statusFilter === s}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs text-gray-500">
          Showing <span className="font-medium text-gray-900">{scans.length}</span> scans
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading scan runs">
          <Spinner className="h-8 w-8 text-blue-600" />
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 rounded-lg bg-red-50 border border-red-200 text-red-800" role="alert">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <h2 className="text-base font-semibold">Failed to Load Scan History</h2>
          </div>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => fetchScans()}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && scans.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h2 className="text-base font-semibold text-gray-900">No Scan Runs Found</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
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
          <div className="hidden md:block overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">Scan ID / Status</th>
                  <th scope="col" className="px-4 py-3 text-left">Watch Profile</th>
                  <th scope="col" className="px-4 py-3 text-left">Started / Duration</th>
                  <th scope="col" className="px-4 py-3 text-center">Companies</th>
                  <th scope="col" className="px-4 py-3 text-center">Discovered</th>
                  <th scope="col" className="px-4 py-3 text-center">New Jobs</th>
                  <th scope="col" className="px-4 py-3 text-center">Matched</th>
                  <th scope="col" className="px-4 py-3 text-center">Errors</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ScanStatusBadge status={scan.status} />
                        <code className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                          {scan.id.substring(0, 8)}
                        </code>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{scan.watch_profile_name || 'System Profile'}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">
                      <div>{new Date(scan.started_at).toLocaleString()}</div>
                      <div className="text-gray-400 mt-0.5">{formatDuration(scan.started_at, scan.completed_at)}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center text-gray-700">
                      {scan.companies_checked}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center font-medium text-gray-900">
                      {scan.jobs_discovered}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center font-medium text-blue-600">
                      {scan.jobs_new}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center font-medium text-emerald-600">
                      {scan.jobs_matched}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <span className={`inline-block font-semibold px-2 py-0.5 rounded-full text-xs ${
                        scan.error_count > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {scan.error_count}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs">
                      <Link
                        to={`/dashboard/scans/${scan.id}`}
                        className="inline-flex items-center font-medium text-blue-600 hover:text-blue-800"
                        aria-label={`View details for scan ${scan.id.substring(0, 8)}`}
                      >
                        Details <ArrowRight className="ml-1 h-3.5 w-3.5" />
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
              <Card key={scan.id} className="border-gray-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <ScanStatusBadge status={scan.status} />
                    <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {scan.id.substring(0, 8)}
                    </code>
                  </div>

                  <div>
                    <span className="text-xs text-gray-400 block uppercase">Watch Profile</span>
                    <p className="text-sm font-semibold text-gray-900">{scan.watch_profile_name || 'Active Profile'}</p>
                  </div>

                  <div className="text-xs text-gray-600 flex justify-between pt-1 border-t border-gray-100">
                    <span>Started: {new Date(scan.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>Duration: {formatDuration(scan.started_at, scan.completed_at)}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-center">
                    <div className="p-1.5 bg-gray-50 rounded">
                      <span className="text-[10px] text-gray-500 block">Checked</span>
                      <span className="text-xs font-bold text-gray-900">{scan.companies_checked}</span>
                    </div>
                    <div className="p-1.5 bg-gray-50 rounded">
                      <span className="text-[10px] text-gray-500 block">Found</span>
                      <span className="text-xs font-bold text-gray-900">{scan.jobs_discovered}</span>
                    </div>
                    <div className="p-1.5 bg-gray-50 rounded">
                      <span className="text-[10px] text-gray-500 block">New</span>
                      <span className="text-xs font-bold text-blue-600">{scan.jobs_new}</span>
                    </div>
                    <div className="p-1.5 bg-gray-50 rounded">
                      <span className="text-[10px] text-gray-500 block">Errors</span>
                      <span className={`text-xs font-bold ${scan.error_count > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {scan.error_count}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      to={`/dashboard/scans/${scan.id}`}
                      className="w-full inline-flex justify-center items-center py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
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
