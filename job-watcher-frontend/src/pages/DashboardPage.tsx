import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { DashboardSummary } from '../types';
import { MetricCard } from '../components/ui/MetricCard';
import { Button } from '../components/ui/Button';
import { ScanStatusBadge } from '../components/scans/ScanStatusBadge';
import { MonitoringOrbit } from '../components/dashboard/MonitoringOrbit';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { parseApiError } from '../lib/utils';
import { 
  Briefcase, 
  Search, 
  Bell, 
  Building2, 
  Activity, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Radio,
  Settings
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const summaryData = await api.get<DashboardSummary>('/api/v1/dashboard/summary');
      setSummary(summaryData);
    } catch (err: any) {
      setError(parseApiError(err, 'Failed to load dashboard overview'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Error Loading Dashboard"
        message={error}
        onRetry={() => fetchDashboard()}
      />
    );
  }

  const latestScan = summary?.latest_scan;

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar & Operational Status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-semibold">
              Live Monitoring Engine Active
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl font-sans">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Real-time telemetry, automated ATS discovery, and instant notification dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </Button>
          <Link to="/dashboard/watch-profiles">
            <Button size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20">
              Manage profiles
            </Button>
          </Link>
        </div>
      </div>

      {/* 5-Card Operational Metrics Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Watch Profiles"
          value={summary?.active_watch_profiles ?? 0}
          icon={Search}
          status="normal"
          subtext="Active monitoring queries"
          badgeText="Active"
        />

        <MetricCard
          label="Monitored Companies"
          value={summary?.monitored_companies ?? 0}
          icon={Building2}
          status="normal"
          subtext="Greenhouse, Lever & custom"
          badgeText="ATS Feeds"
        />

        <MetricCard
          label="Available Jobs"
          value={summary?.available_jobs ?? 0}
          icon={Briefcase}
          status="normal"
          subtext="Total discovered postings"
          badgeText="Discovered"
        />

        <MetricCard
          label="Matched Jobs"
          value={summary?.matched_jobs ?? 0}
          icon={CheckCircle2}
          status="normal"
          subtext="Aligned with profile rules"
          badgeText="Qualified"
        />

        {/* Total Notifications Card with breakdowns */}
        <div className="group relative rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 backdrop-blur-sm transition-all duration-200 hover:border-slate-700/80 hover:bg-slate-900/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-medium tracking-wider text-slate-400 uppercase">
                Notifications
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/60 text-slate-400 group-hover:text-cyan-400 transition-colors">
                <Bell className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-white font-mono">
                {summary?.notifications.total ?? 0}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
            <span className="text-emerald-400 font-medium">{summary?.notifications.sent ?? 0} sent</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-amber-400 font-medium">{summary?.notifications.pending ?? 0} pend</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-red-400 font-medium">{summary?.notifications.failed ?? 0} fail</span>
          </div>
        </div>
      </div>

      {/* 3D Radar Orbit & Live Monitoring Stream */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Radar Orbit Visualizer */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
              <h2 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                Automated Scanner Telemetry & ATS Orbit
              </h2>
            </div>
            <span className="text-[11px] font-mono text-cyan-400/80 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              4 ATS Targets Active
            </span>
          </div>

          <div className="my-2">
            <MonitoringOrbit height={240} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800/60 text-xs font-mono">
            <div className="bg-slate-950/40 border border-slate-800/40 p-2 rounded-lg">
              <span className="text-[10px] text-slate-500 block uppercase">Protocol</span>
              <span className="text-slate-300 font-medium">Headless HTTP</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-800/40 p-2 rounded-lg">
              <span className="text-[10px] text-slate-500 block uppercase">Matching Engine</span>
              <span className="text-emerald-400 font-medium">Deterministic Rule</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-800/40 p-2 rounded-lg">
              <span className="text-[10px] text-slate-500 block uppercase">Alert Channel</span>
              <span className="text-sky-400 font-medium">Telegram Bot API</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-800/40 p-2 rounded-lg">
              <span className="text-[10px] text-slate-500 block uppercase">System Status</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                Operational
              </span>
            </div>
          </div>
        </div>

        {/* Schedule Info & Status Card */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                  Scan Scheduler & Execution
                </h3>
              </div>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
                <span className="text-[11px] font-mono text-cyan-400 uppercase block font-semibold mb-1">
                  Active Schedule
                </span>
                <p className="text-xs font-mono text-slate-200">
                  {summary?.schedule_info || 'Scheduled every 2 hours via GitHub Actions'}
                </p>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                The worker continuously scans all configured company career sites for your active Watch Profiles, filters duplicate postings, executes deterministic rule evaluation, and dispatches Telegram notifications.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-2">
            <Link to="/dashboard/jobs" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/50">
                <span className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                  View Matched Jobs
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </Link>
            <Link to="/dashboard/jobs" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/50">
                <span className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  Browse all jobs
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </Link>
            <Link to="/dashboard/scans" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/50">
                <span className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-slate-400" />
                  Scan History & Logs
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </Link>
            <Link to="/dashboard/notifications" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/50">
                <span className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-slate-400" />
                  View alerts
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </Link>
            <Link to="/dashboard/settings" className="block">
              <Button variant="outline" size="sm" className="w-full justify-between text-xs border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/50">
                <span className="flex items-center gap-2">
                  <Settings className="h-3.5 w-3.5 text-slate-400" />
                  Account Settings
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Latest Automated Scan Panel */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/60 gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h3 className="text-base font-semibold text-white font-sans">Latest Automated Scan</h3>
          </div>
          {latestScan && (
            <div className="flex items-center gap-2.5">
              <ScanStatusBadge status={latestScan.status} />
              <Link
                to={`/dashboard/scans/${latestScan.id}`}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 font-mono"
              >
                View Details <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

        {latestScan ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-xs font-mono pb-3 border-b border-slate-800/40 text-slate-400">
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Watch Profile</span>
                <span className="font-semibold text-white">{latestScan.watch_profile_name || 'Active Profile'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Started At</span>
                <span className="font-medium text-slate-200">
                  {new Date(latestScan.started_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Completed At</span>
                <span className="font-medium text-slate-200">
                  {latestScan.completed_at ? new Date(latestScan.completed_at).toLocaleString() : 'In Progress...'}
                </span>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                <span className="text-[11px] text-slate-400 font-mono font-medium block">Companies Checked</span>
                <p className="text-lg font-bold text-white font-mono mt-0.5">{latestScan.companies_checked}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                <span className="text-[11px] text-slate-400 font-mono font-medium block">Jobs Discovered</span>
                <p className="text-lg font-bold text-white font-mono mt-0.5">{latestScan.jobs_discovered}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                <span className="text-[11px] text-slate-400 font-mono font-medium block">New Jobs</span>
                <p className="text-lg font-bold text-cyan-400 font-mono mt-0.5">{latestScan.jobs_new}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                <span className="text-[11px] text-slate-400 font-mono font-medium block">Jobs Matched</span>
                <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{latestScan.jobs_matched}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                <span className="text-[11px] text-slate-400 font-mono font-medium block">Notifs Sent</span>
                <p className="text-lg font-bold text-sky-400 font-mono mt-0.5">{latestScan.notifications_sent}</p>
              </div>
              <div className={`p-3 rounded-xl border ${latestScan.error_count > 0 ? 'bg-red-950/30 border-red-500/30' : 'bg-slate-950/60 border-slate-800/60'}`}>
                <span className={`text-[11px] font-mono font-medium block ${latestScan.error_count > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  Failures / Errors
                </span>
                <p className={`text-lg font-bold font-mono mt-0.5 ${latestScan.error_count > 0 ? 'text-red-400' : 'text-white'}`}>
                  {latestScan.error_count}
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-mono text-slate-400">
              <span>
                Safe identifier: <code className="bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-cyan-400 font-mono">{latestScan.id.substring(0, 8)}</code>
              </span>
              <Link to="/dashboard/scans" className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1">
                View Full Scan History <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <Clock className="mx-auto h-8 w-8 text-slate-500 mb-2" />
            <p className="text-sm font-medium text-white">No automated scans recorded yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Automated crawler scans execute periodically via GitHub Actions to discover fresh jobs and deliver alerts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
