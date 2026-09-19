import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Notification, User } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Bell } from 'lucide-react';

const PAGE_SIZE = 10;

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'pending' | 'failed'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'telegram'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [profileFilter, setProfileFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Detail Modal / Panel State
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Retry state
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryFeedback, setRetryFeedback] = useState<{ id: string; type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [notifsData, userData] = await Promise.all([
        api.get<Notification[]>('/api/v1/notifications'),
        api.get<User>('/api/v1/me').catch(() => null),
      ]);
      setNotifications(notifsData);
      if (userData) {
        setCurrentUser(userData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (notificationId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setRetryingId(notificationId);
      setRetryFeedback(null);
      const updated = await api.post<Notification>(`/api/v1/notifications/${notificationId}/retry`);
      
      // Update in notifications list
      setNotifications(prev => prev.map(n => n.id === notificationId ? updated : n));
      
      // Update selected modal if open
      if (selectedNotification && selectedNotification.id === notificationId) {
        setSelectedNotification(updated);
      }
      
      setRetryFeedback({ id: notificationId, type: 'success', message: 'Notification sent successfully!' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to retry notification';
      setRetryFeedback({ id: notificationId, type: 'error', message: msg });
    } finally {
      setRetryingId(null);
    }
  };

  // Extract unique companies and profiles from notifications
  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach(n => {
      if (n.company_name) set.add(n.company_name);
    });
    return Array.from(set).sort();
  }, [notifications]);

  const availableProfiles = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach(n => {
      if (n.watch_profile_name) set.add(n.watch_profile_name);
    });
    return Array.from(set).sort();
  }, [notifications]);

  // Filter & Sort
  const filteredNotifications = useMemo(() => {
    return notifications
      .filter(n => {
        // Status filter
        if (statusFilter !== 'all' && n.status.toLowerCase() !== statusFilter) {
          return false;
        }
        // Channel filter
        if (channelFilter !== 'all' && n.channel.toLowerCase() !== channelFilter) {
          return false;
        }
        // Company filter
        if (companyFilter !== 'all' && n.company_name !== companyFilter) {
          return false;
        }
        // Profile filter
        if (profileFilter !== 'all' && n.watch_profile_name !== profileFilter) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (n.job_title || '').toLowerCase().includes(q);
          const matchCompany = (n.company_name || '').toLowerCase().includes(q);
          const matchProfile = (n.watch_profile_name || '').toLowerCase().includes(q);
          if (!matchTitle && !matchCompany && !matchProfile) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [notifications, statusFilter, channelFilter, companyFilter, profileFilter, searchQuery, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredNotifications.length / PAGE_SIZE) || 1;
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredNotifications.slice(start, start + PAGE_SIZE);
  }, [filteredNotifications, currentPage]);

  const isFiltered = Boolean(
    searchQuery.trim() ||
    statusFilter !== 'all' ||
    channelFilter !== 'all' ||
    companyFilter !== 'all' ||
    profileFilter !== 'all' ||
    sortBy !== 'newest'
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setChannelFilter('all');
    setCompanyFilter('all');
    setProfileFilter('all');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
            ✓ Sent
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold bg-red-950/60 border border-red-500/40 text-red-400">
            ✕ Failed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold bg-amber-950/60 border border-amber-500/40 text-amber-400">
            ⏳ Pending
          </span>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" data-testid="notifications-loading">
        <Spinner className="h-8 w-8 text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-800/60 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
              Telemetry Dispatch
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl font-sans">
            Notifications
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Track your job alerts and Telegram delivery status.
          </p>
        </div>
      </div>

      {/* Telegram Configuration Notice if missing */}
      {currentUser && !currentUser.telegram_chat_id && (
        <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 text-lg">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-200">Telegram Chat ID Not Configured</p>
              <p className="text-xs text-amber-400/80 mt-0.5 font-mono">
                Configure your Telegram Chat ID to receive Telegram job alerts.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/settings"
            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 whitespace-nowrap transition-colors"
          >
            Configure in Settings &rarr;
          </Link>
        </div>
      )}

      {/* Error state */}
      {error && <ErrorMessage message={error} />}

      {/* Filters Toolbar */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 shadow-lg space-y-3 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by job, company, or profile..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border-slate-800 text-white placeholder-slate-500"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-40">
            <select
              aria-label="Filter by Status"
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="all" className="bg-slate-900 text-white">All Statuses</option>
              <option value="sent" className="bg-slate-900 text-white">Sent</option>
              <option value="pending" className="bg-slate-900 text-white">Pending</option>
              <option value="failed" className="bg-slate-900 text-white">Failed</option>
            </select>
          </div>

          {/* Channel Filter */}
          <div className="w-full md:w-36">
            <select
              aria-label="Filter by Channel"
              value={channelFilter}
              onChange={e => {
                setChannelFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="all" className="bg-slate-900 text-white">All Channels</option>
              <option value="telegram" className="bg-slate-900 text-white">Telegram</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/80 font-mono text-xs">
          {/* Company Filter */}
          {availableCompanies.length > 0 && (
            <div className="w-full sm:w-auto">
              <select
                aria-label="Filter by Company"
                value={companyFilter}
                onChange={e => {
                  setCompanyFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-800 bg-slate-950 text-slate-200 px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="all" className="bg-slate-900 text-white">All Companies</option>
                {availableCompanies.map(c => (
                  <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Profile Filter */}
          {availableProfiles.length > 0 && (
            <div className="w-full sm:w-auto">
              <select
                aria-label="Filter by Profile"
                value={profileFilter}
                onChange={e => {
                  setProfileFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-800 bg-slate-950 text-slate-200 px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="all" className="bg-slate-900 text-white">All Profiles</option>
                {availableProfiles.map(p => (
                  <option key={p} value={p} className="bg-slate-900 text-white">{p}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sorting */}
          <div className="w-full sm:w-auto">
            <select
              aria-label="Sort notifications"
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-800 bg-slate-950 text-slate-200 px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="newest" className="bg-slate-900 text-white">Newest first</option>
              <option value="oldest" className="bg-slate-900 text-white">Oldest first</option>
            </select>
          </div>

          {/* Clear Filters */}
          {isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs py-1 px-2.5 h-auto border-slate-800 text-slate-300 hover:text-white"
            >
              Clear filters
            </Button>
          )}

          <div className="ml-auto text-xs font-mono text-slate-400">
            Showing <span className="text-cyan-400 font-bold">{filteredNotifications.length}</span> of <span className="text-white font-bold">{notifications.length}</span> notifications
          </div>
        </div>
      </div>

      {/* Global feedback banner for retrying */}
      {retryFeedback && (
        <div
          className={`p-3 rounded-xl text-xs font-mono border ${
            retryFeedback.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
              : 'bg-red-950/40 text-red-300 border-red-500/30'
          }`}
        >
          {retryFeedback.message}
        </div>
      )}

      {/* List / Empty States */}
      {notifications.length === 0 ? (
        /* Empty state: No notifications at all */
        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
          <div className="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 text-2xl mb-4 border border-slate-700">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No notifications yet</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm font-mono">
            Notifications will appear after matching jobs are detected and delivered.
          </p>
          <Link
            to="/dashboard/jobs"
            className="mt-4 inline-flex items-center text-xs font-mono font-medium text-cyan-400 hover:text-cyan-300"
          >
            Browse matching jobs &rarr;
          </Link>
        </div>
      ) : filteredNotifications.length === 0 ? (
        /* Empty state: Filters yielded zero results */
        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
          <h3 className="text-base font-semibold text-white">No notifications match your current filters</h3>
          <p className="mt-1 text-xs text-slate-400 font-mono">
            Try adjusting your search keywords, status filter, or company selection.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="mt-4 border-slate-800 text-slate-300 hover:text-white"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        /* Notification Cards List */
        <div className="space-y-3">
          {paginatedNotifications.map(notification => {
            const targetUrl = notification.apply_url || notification.source_url;
            const isRetrying = retryingId === notification.id;

            return (
              <Card
                key={notification.id}
                className="border-slate-800/80 bg-slate-900/70 hover:border-slate-700/90 transition-all duration-200 cursor-pointer group"
                onClick={() => setSelectedNotification(notification)}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Company & Profile Tags */}
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                        <span className="font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                          {notification.company_name || 'Unknown Company'}
                        </span>
                        {notification.watch_profile_name && (
                          <span className="text-slate-300 bg-slate-950/60 border border-slate-800 px-2 py-0.5 rounded">
                            Profile: {notification.watch_profile_name}
                          </span>
                        )}
                        <span className="text-sky-400 bg-sky-950/40 border border-sky-500/20 px-2 py-0.5 rounded capitalize">
                          {notification.channel}
                        </span>
                      </div>

                      {/* Job Title */}
                      <h3 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors break-words font-sans">
                        {notification.job_title || 'Job Posting'}
                      </h3>

                      {/* Timestamps */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
                        {notification.status === 'sent' && notification.sent_at ? (
                          <span>Sent: {formatDate(notification.sent_at)}</span>
                        ) : (
                          <span>Created: {formatDate(notification.created_at)}</span>
                        )}
                      </div>

                      {/* Failure message preview if failed */}
                      {notification.status === 'failed' && notification.error_message && (
                        <div className="mt-2 text-xs font-mono text-red-300 bg-red-950/40 p-2.5 rounded-lg border border-red-500/30 break-words">
                          <span className="font-semibold text-red-200">Failure reason: </span>
                          {notification.error_message}
                        </div>
                      )}
                    </div>

                    {/* Status badge & Action buttons */}
                    <div
                      className="flex flex-row sm:flex-col items-end sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800"
                      onClick={e => e.stopPropagation()}
                    >
                      <div>{renderStatusBadge(notification.status)}</div>

                      <div className="flex items-center gap-2 mt-1">
                        {notification.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs py-1 px-2.5 h-auto border-red-500/30 text-red-300 hover:bg-red-950/40"
                            onClick={e => handleRetry(notification.id, e)}
                            isLoading={isRetrying}
                            disabled={isRetrying}
                          >
                            Retry
                          </Button>
                        )}
                        {targetUrl && (
                          <a
                            href={targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-2.5 py-1 text-xs font-semibold text-slate-950 hover:bg-cyan-400 shadow-sm"
                          >
                            Apply ↗
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs py-1 px-2 h-auto text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                          onClick={() => setSelectedNotification(notification)}
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-slate-800 bg-slate-900/80 px-4 py-3 rounded-xl sm:px-6 shadow-sm font-mono text-xs">
          <div className="text-slate-400">
            Page <span className="text-cyan-400 font-bold">{currentPage}</span> of{' '}
            <span className="text-white font-bold">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="border-slate-800 text-slate-300 hover:text-white text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="border-slate-800 text-slate-300 hover:text-white text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedNotification && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedNotification(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-modal-title"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
                  {selectedNotification.company_name || 'Unknown Company'}
                </span>
                <h2 id="notification-modal-title" className="text-xl font-bold text-white mt-0.5 font-sans">
                  {selectedNotification.job_title || 'Job Posting'}
                </h2>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 text-lg leading-none transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                {renderStatusBadge(selectedNotification.status)}
                <span className="bg-slate-950 border border-slate-800 text-slate-300 px-2.5 py-0.5 rounded capitalize">
                  Channel: {selectedNotification.channel}
                </span>
                {selectedNotification.watch_profile_name && (
                  <span className="bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 px-2.5 py-0.5 rounded">
                    Profile: {selectedNotification.watch_profile_name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block">Created Time:</span>
                  <p className="text-slate-200 mt-0.5">{formatDate(selectedNotification.created_at)}</p>
                </div>
                <div>
                  <span className="text-slate-500 block">Sent Time:</span>
                  <p className="text-slate-200 mt-0.5">{formatDate(selectedNotification.sent_at)}</p>
                </div>
                {selectedNotification.recipient && (
                  <div>
                    <span className="text-slate-500 block">Recipient Destination:</span>
                    <p className="text-cyan-400 mt-0.5">{selectedNotification.recipient}</p>
                  </div>
                )}
              </div>

              {/* Failure message if failed */}
              {selectedNotification.status === 'failed' && selectedNotification.error_message && (
                <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 text-xs font-mono">
                  <span className="font-semibold text-red-200 block mb-1">✕ Failure Reason</span>
                  <p className="text-red-300 break-words">
                    {selectedNotification.error_message}
                  </p>
                </div>
              )}

              {/* Match Reason Context */}
              {(selectedNotification.match_reason || selectedNotification.match_score !== undefined) && (
                <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-4 text-xs font-mono space-y-1.5">
                  <span className="font-semibold text-cyan-300 block text-sm">Why this job matched</span>
                  {selectedNotification.match_score !== undefined && selectedNotification.match_score !== null && (
                    <p className="text-slate-300">
                      Confidence Score: <span className="font-bold text-emerald-400">{Math.round(selectedNotification.match_score * 100)}%</span>
                    </p>
                  )}
                  {selectedNotification.match_reason && (
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {selectedNotification.match_reason}
                    </p>
                  )}
                </div>
              )}

              {/* Alert Content Preview */}
              {selectedNotification.message && (
                <div>
                  <span className="text-xs font-mono text-slate-400 uppercase block mb-1">Message Preview</span>
                  <div className="bg-slate-950 border border-slate-800 text-slate-200 p-3 rounded-xl font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedNotification.message}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4 font-mono text-xs">
              <Link
                to={`/dashboard/notifications/${selectedNotification.id}`}
                className="text-cyan-400 hover:text-cyan-300"
              >
                Open Full Detail Page &rarr;
              </Link>
              <div className="flex items-center gap-2">
                {selectedNotification.status === 'failed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetry(selectedNotification.id)}
                    isLoading={retryingId === selectedNotification.id}
                    disabled={retryingId === selectedNotification.id}
                    className="border-red-500/30 text-red-300 hover:bg-red-950/40"
                  >
                    Retry Delivery
                  </Button>
                )}
                {(selectedNotification.apply_url || selectedNotification.source_url) && (
                  <a
                    href={selectedNotification.apply_url || selectedNotification.source_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    Apply / View Job ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
