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
        <Spinner className="h-8 w-8 text-cyan-400" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/scans')}
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Scans
        </Button>
        <Card className="border-slate-800/80 bg-slate-900/60">
          <CardContent className="py-14 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-400 mb-3" />
            <h1 className="text-xl font-bold text-white font-sans">Scan Run Not Found</h1>
            <p className="text-xs font-mono text-slate-400 mt-1 max-w-md mx-auto">
              The requested scan record does not exist or does not belong to your active watch profiles.
            </p>
            <div className="mt-6">
              <Link to="/dashboard/scans">
                <Button variant="outline" size="sm" className="border-slate-800 text-slate-300 hover:text-white text-xs">
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
      <div className="space-y-4 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/scans')}
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-mono text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Scans
        </Button>
        <div className="p-6 rounded-xl bg-red-950/20 border border-red-500/30 text-red-200" role="alert">
          <h2 className="text-base font-semibold text-white">Error Loading Scan Details</h2>
          <p className="mt-2 text-xs font-mono text-red-300/80">{error}</p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => fetchScanDetail()} className="border-red-500/40 text-red-200 hover:bg-red-950/40 text-xs">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Navigation & Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/scans')}
          className="mb-3 text-cyan-400 hover:text-cyan-300 flex items-center gap-1 -ml-2 font-mono text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Scan History</span>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800/60 gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
                Scan Details
              </h1>
              <ScanStatusBadge status={scan.status} />
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1.5 flex flex-wrap items-center gap-2">
              <span>Watch Profile: <span className="font-semibold text-white">{scan.watch_profile_name || 'Active Profile'}</span></span>
              <span className="text-slate-600">•</span>
              <span>Run ID: <code className="bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-cyan-400">{scan.id}</code></span>
            </p>
          </div>
        </div>
      </div>

      {/* Execution Summary Card */}
      <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
        <CardHeader className="pb-3 border-b border-slate-800/60">
          <CardTitle className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            Execution Timeline & Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Started At</span>
              <span className="font-semibold text-white mt-0.5 block">{new Date(scan.started_at).toLocaleString()}</span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Completed At</span>
              <span className="font-semibold text-white mt-0.5 block">
                {scan.completed_at ? new Date(scan.completed_at).toLocaleString() : 'In Progress...'}
              </span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Execution Duration</span>
              <span className="font-semibold text-cyan-400 mt-0.5 block">{formatDuration(scan.started_at, scan.completed_at)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardContent className="p-4 text-center">
            <span className="text-[11px] font-mono font-medium text-slate-400 uppercase">Companies</span>
            <p className="text-2xl font-bold text-white font-mono mt-1">{scan.companies_checked}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardContent className="p-4 text-center">
            <span className="text-[11px] font-mono font-medium text-slate-400 uppercase">Discovered</span>
            <p className="text-2xl font-bold text-white font-mono mt-1">{scan.jobs_discovered}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardContent className="p-4 text-center">
            <span className="text-[11px] font-mono font-medium text-slate-400 uppercase">New Jobs</span>
            <p className="text-2xl font-bold text-cyan-400 font-mono mt-1">{scan.jobs_new}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardContent className="p-4 text-center">
            <span className="text-[11px] font-mono font-medium text-slate-400 uppercase">Matched</span>
            <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{scan.jobs_matched}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardContent className="p-4 text-center">
            <span className="text-[11px] font-mono font-medium text-slate-400 uppercase">Notifications</span>
            <p className="text-2xl font-bold text-sky-400 font-mono mt-1">{scan.notifications_sent}</p>
          </CardContent>
        </Card>
        <Card className={`border-slate-800/80 ${scan.error_count > 0 ? 'bg-red-950/20 border-red-500/30' : 'bg-slate-900/70'}`}>
          <CardContent className="p-4 text-center">
            <span className={`text-[11px] font-mono font-medium uppercase ${scan.error_count > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              Errors
            </span>
            <p className={`text-2xl font-bold font-mono mt-1 ${scan.error_count > 0 ? 'text-red-400' : 'text-white'}`}>
              {scan.error_count}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Companies Scanned Breakdown */}
      <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
        <CardHeader className="pb-3 border-b border-slate-800/60">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cyan-400" />
            Monitored Companies Processed ({scan.company_statuses.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {scan.company_statuses.length > 0 ? (
            <div className="divide-y divide-slate-800/60">
              {scan.company_statuses.map((cs) => (
                <div key={cs.company_id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-800/30 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{cs.company_name}</span>
                      {cs.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-red-400 bg-red-950/60 px-2.5 py-0.5 rounded-full border border-red-500/30">
                          <XCircle className="h-3 w-3" /> Failed
                        </span>
                      )}
                    </div>
                    {cs.career_url && (
                      <a
                        href={cs.career_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-xs font-mono text-slate-400 hover:text-cyan-300 inline-flex items-center gap-1 break-all"
                      >
                        {cs.career_url} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    )}
                    {cs.error_message && (
                      <p className="text-xs text-red-300 font-mono mt-1 bg-red-950/40 p-2 rounded-lg border border-red-500/30">
                        {cs.error_type ? `[${cs.error_type}] ` : ''}{cs.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs font-mono text-slate-400">
              No individual company records associated with this watch profile.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Errors Breakdown */}
      <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
        <CardHeader className="pb-3 border-b border-slate-800/60">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Error Details & Diagnostics ({scan.errors.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {scan.errors.length > 0 ? (
            <div className="space-y-3">
              {scan.errors.map((err) => (
                <div
                  key={err.id}
                  className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 space-y-2 text-xs font-mono"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm font-sans">
                        {err.company_name || 'System / General'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-950 border border-red-500/40 text-red-300">
                        {err.error_type}
                      </span>
                    </div>
                    <span className="text-slate-400">
                      {new Date(err.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  {err.message && (
                    <div className="text-xs text-red-200 font-mono bg-slate-950/80 p-3 rounded-lg border border-red-500/20 overflow-x-auto whitespace-pre-wrap break-all">
                      {err.message}
                    </div>
                  )}

                  {err.details && Object.keys(err.details).length > 0 && (
                    <details className="text-xs text-slate-400 pt-1">
                      <summary className="cursor-pointer font-medium text-slate-300 hover:text-white">
                        View Technical Diagnostics Details
                      </summary>
                      <pre className="mt-2 bg-slate-950 border border-slate-800 text-cyan-300 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
                        {JSON.stringify(err.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
              <p className="font-semibold text-white text-sm">No Scan Errors</p>
              <p className="text-xs font-mono text-slate-400 mt-1">
                All crawler endpoints and rule evaluation steps finished cleanly.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanDetailPage;
