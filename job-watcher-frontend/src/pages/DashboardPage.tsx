import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { DashboardSummary } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ScanStatusBadge } from '../components/scans/ScanStatusBadge';
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
  AlertTriangle, 
  ArrowRight,
  ExternalLink,
  Settings
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await api.get<DashboardSummary>('/api/v1/dashboard/summary');
      setSummary(data);
    } catch (err: any) {
      setError(parseApiError(err, 'Failed to load dashboard overview'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading dashboard">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-red-50 border border-red-200 text-red-800" role="alert">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <h2 className="text-base font-semibold">Error Loading Dashboard</h2>
        </div>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => fetchSummary()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const latestScan = summary?.latest_scan;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            System overview and monitoring for <span className="font-medium text-gray-700">{user?.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSummary(true)}
            disabled={refreshing}
            className="flex items-center gap-2"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Active Watch Profiles */}
        <Card className="hover:border-blue-300 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Watch Profiles
            </CardTitle>
            <Search className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summary?.active_watch_profiles ?? 0}</div>
            <p className="text-xs text-gray-500 mt-1">Active monitoring setups</p>
            <Link
              to="/dashboard/watch-profiles"
              className="mt-3 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Manage profiles <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Monitored Companies */}
        <Card className="hover:border-blue-300 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Companies
            </CardTitle>
            <Building2 className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summary?.monitored_companies ?? 0}</div>
            <p className="text-xs text-gray-500 mt-1">Monitored career sites</p>
            <Link
              to="/dashboard/watch-profiles"
              className="mt-3 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              View companies <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Available Jobs */}
        <Card className="hover:border-blue-300 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Available Jobs
            </CardTitle>
            <Briefcase className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summary?.available_jobs ?? 0}</div>
            <p className="text-xs text-gray-500 mt-1">From monitored companies</p>
            <Link
              to="/dashboard/jobs"
              className="mt-3 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Browse all jobs <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Matched Jobs */}
        <Card className="hover:border-blue-300 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Matched Jobs
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summary?.matched_jobs ?? 0}</div>
            <p className="text-xs text-gray-500 mt-1">Rule matches across profiles</p>
            <Link
              to="/dashboard/jobs"
              className="mt-3 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              View matches <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="hover:border-blue-300 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Notifications
            </CardTitle>
            <Bell className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summary?.notifications.total ?? 0}</div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-green-700 font-medium">{summary?.notifications.sent ?? 0} sent</span>
              <span className="text-gray-300">•</span>
              <span className="text-amber-700 font-medium">{summary?.notifications.pending ?? 0} pend</span>
              {summary?.notifications.failed ? (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-red-600 font-medium">{summary.notifications.failed} fail</span>
                </>
              ) : null}
            </div>
            <Link
              to="/dashboard/notifications"
              className="mt-3 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              View alerts <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Latest Scan Section */}
      <Card className="border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base font-semibold text-gray-900">Latest Automated Scan</CardTitle>
            </div>
            {latestScan && (
              <div className="flex items-center gap-2">
                <ScanStatusBadge status={latestScan.status} />
                <Link
                  to={`/dashboard/scans/${latestScan.id}`}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                >
                  View Details <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {latestScan ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 pb-3 border-b border-gray-100">
                <div>
                  <span className="text-gray-400 text-xs uppercase block">Watch Profile</span>
                  <span className="font-medium text-gray-900">{latestScan.watch_profile_name || 'Active Profile'}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase block">Started At</span>
                  <span className="font-medium text-gray-900">
                    {new Date(latestScan.started_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase block">Completed At</span>
                  <span className="font-medium text-gray-900">
                    {latestScan.completed_at ? new Date(latestScan.completed_at).toLocaleString() : 'In Progress...'}
                  </span>
                </div>
              </div>

              {/* Metrics Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Companies Checked</span>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{latestScan.companies_checked}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Jobs Discovered</span>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{latestScan.jobs_discovered}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">New Jobs</span>
                  <p className="text-lg font-bold text-blue-600 mt-0.5">{latestScan.jobs_new}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Jobs Matched</span>
                  <p className="text-lg font-bold text-emerald-600 mt-0.5">{latestScan.jobs_matched}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Notifs Sent</span>
                  <p className="text-lg font-bold text-indigo-600 mt-0.5">{latestScan.notifications_sent}</p>
                </div>
                <div className={`p-3 rounded-lg border ${latestScan.error_count > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`text-xs font-medium ${latestScan.error_count > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                    Failures / Errors
                  </span>
                  <p className={`text-lg font-bold mt-0.5 ${latestScan.error_count > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                    {latestScan.error_count}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs text-gray-500">
                <span>Safe identifier: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{latestScan.id.substring(0, 8)}</code></span>
                <Link to="/dashboard/scans" className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
                  View Full Scan History <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-900">No automated scans recorded yet</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Automated crawler scans execute periodically via GitHub Actions to discover fresh jobs and deliver alerts.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Info & System Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Scan Scheduler & Execution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-800 font-medium">
              {summary?.schedule_info || 'Scheduled every 2 hours via GitHub Actions'}
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              The worker continuously scans all configured company career sites for your active Watch Profiles, filters duplicate postings, executes deterministic rule evaluation, and dispatches Telegram notifications.
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/dashboard/jobs" className="block">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                <Briefcase className="mr-2 h-3.5 w-3.5 text-gray-500" />
                View Matched Jobs
              </Button>
            </Link>
            <Link to="/dashboard/scans" className="block">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                <Activity className="mr-2 h-3.5 w-3.5 text-gray-500" />
                Scan History & Logs
              </Button>
            </Link>
            <Link to="/dashboard/notifications" className="block">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                <Bell className="mr-2 h-3.5 w-3.5 text-gray-500" />
                Telegram Notifications
              </Button>
            </Link>
            <Link to="/dashboard/settings" className="block">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                <Settings className="mr-2 h-3.5 w-3.5 text-gray-500" />
                Account Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
