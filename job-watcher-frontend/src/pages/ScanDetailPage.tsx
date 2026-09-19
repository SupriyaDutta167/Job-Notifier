import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ScanDetail } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ScanStatusBadge } from '../components/scans/ScanStatusBadge';
import { parseApiError } from '../lib/utils';
import { 
  ArrowLeft, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Clock
} from 'lucide-react';

export const ScanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchScanDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const data = await api.get<ScanDetail>(`/api/v1/scan-runs/${id}`);
      setScan(data);
    } catch (err: any) {
      if (err.status === 404) {
        setNotFound(true);
      } else {
        setError(parseApiError(err, 'Failed to load scan run details'));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchScanDetail();
  }, [fetchScanDetail]);

  const formatDuration = (start: string, end?: string | null) => {
    if (!end) return 'In progress...';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diffSeconds = Math.max(0, Math.round((e - s) / 1000));
    if (diffSeconds < 60) return `${diffSeconds} seconds`;
    const minutes = Math.floor(diffSeconds / 60);
    const remainingSeconds = diffSeconds % 60;
    return `${minutes} min ${remainingSeconds} sec`;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading scan details">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/scans')} className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Scans
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
            <h1 className="text-xl font-bold text-gray-900">Scan Run Not Found</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              The requested scan record does not exist or does not belong to your active watch profiles.
            </p>
            <div className="mt-6">
              <Link to="/dashboard/scans">
                <Button variant="outline" size="sm">
                  Return to Scan History
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/scans')} className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Scans
        </Button>
        <div className="p-6 rounded-lg bg-red-50 border border-red-200 text-red-800" role="alert">
          <h2 className="text-base font-semibold">Error Loading Scan Details</h2>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => fetchScanDetail()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/scans')}
          className="mb-3 text-gray-600 hover:text-gray-900 flex items-center gap-1 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Scan History</span>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Scan Details
              </h1>
              <ScanStatusBadge status={scan.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Watch Profile: <span className="font-semibold text-gray-800">{scan.watch_profile_name || 'Active Profile'}</span>
              <span className="mx-2 text-gray-300">•</span>
              Run ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs text-gray-700 font-mono">{scan.id}</code>
            </p>
          </div>
        </div>
      </div>

      {/* Execution Summary Card */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            Execution Timeline & Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs text-gray-400 uppercase block font-medium">Started At</span>
              <span className="font-medium text-gray-900">{new Date(scan.started_at).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase block font-medium">Completed At</span>
              <span className="font-medium text-gray-900">
                {scan.completed_at ? new Date(scan.completed_at).toLocaleString() : 'In Progress...'}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase block font-medium">Execution Duration</span>
              <span className="font-medium text-gray-900">{formatDuration(scan.started_at, scan.completed_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <span className="text-xs font-semibold text-gray-500 uppercase">Companies</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{scan.companies_checked}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <span className="text-xs font-semibold text-gray-500 uppercase">Discovered</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{scan.jobs_discovered}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <span className="text-xs font-semibold text-gray-500 uppercase">New Jobs</span>
            <p className="text-2xl font-bold text-blue-600 mt-1">{scan.jobs_new}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <span className="text-xs font-semibold text-gray-500 uppercase">Matched</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{scan.jobs_matched}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <span className="text-xs font-semibold text-gray-500 uppercase">Notifications</span>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{scan.notifications_sent}</p>
          </CardContent>
        </Card>
        <Card className={`border-gray-200 ${scan.error_count > 0 ? 'bg-red-50/50' : ''}`}>
          <CardContent className="p-4 text-center">
            <span className={`text-xs font-semibold uppercase ${scan.error_count > 0 ? 'text-red-700' : 'text-gray-500'}`}>
              Errors
            </span>
            <p className={`text-2xl font-bold mt-1 ${scan.error_count > 0 ? 'text-red-700' : 'text-gray-900'}`}>
              {scan.error_count}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Companies Scanned Breakdown */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" />
            Monitored Companies Processed ({scan.company_statuses.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {scan.company_statuses.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {scan.company_statuses.map((cs) => (
                <div key={cs.company_id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50/75 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{cs.company_name}</span>
                      {cs.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          <XCircle className="h-3 w-3" /> Failed
                        </span>
                      )}
                    </div>
                    {cs.career_url && (
                      <a
                        href={cs.career_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-xs text-gray-500 hover:text-blue-600 inline-flex items-center gap-1 break-all"
                      >
                        {cs.career_url} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    )}
                    {cs.error_message && (
                      <p className="text-xs text-red-600 font-mono mt-1 bg-red-50 p-1.5 rounded border border-red-100">
                        {cs.error_type ? `[${cs.error_type}] ` : ''}{cs.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-gray-500">
              No individual company records associated with this watch profile.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Errors Breakdown */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Error Details & Diagnostics ({scan.errors.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {scan.errors.length > 0 ? (
            <div className="space-y-3">
              {scan.errors.map((err) => (
                <div
                  key={err.id}
                  className="p-4 rounded-lg bg-red-50/60 border border-red-200 space-y-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {err.company_name || 'System / General'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-red-100 text-red-800">
                        {err.error_type}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(err.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  {err.message && (
                    <div className="text-xs text-red-900 font-mono bg-white p-2.5 rounded border border-red-100 overflow-x-auto whitespace-pre-wrap break-all">
                      {err.message}
                    </div>
                  )}

                  {err.details && Object.keys(err.details).length > 0 && (
                    <details className="text-xs text-gray-700">
                      <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-900">
                        View Technical Diagnostics Details
                      </summary>
                      <pre className="mt-2 bg-gray-900 text-gray-100 p-3 rounded font-mono text-[11px] overflow-x-auto">
                        {JSON.stringify(err.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-gray-600">
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-500 mb-2" />
              <p className="font-medium text-gray-900">No Scan Errors</p>
              <p className="text-xs text-gray-500 mt-0.5">
                All crawler endpoints and rule evaluation steps finished cleanly.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
