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
        return <Badge variant="success" className="gap-1">✓ Sent</Badge>;
      case 'failed':
        return <Badge variant="error" className="gap-1">✕ Failed</Badge>;
      case 'pending':
        return <Badge variant="warning" className="gap-1">⏳ Pending</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" data-testid="notifications-loading">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">Track your job alerts and Telegram delivery status.</p>
        </div>
      </div>

      {/* Telegram Configuration Notice if missing */}
      {currentUser && !currentUser.telegram_chat_id && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-lg">⚠️</span>
            <div>
              <p className="text-sm font-medium text-amber-900">Telegram Chat ID Not Configured</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Configure your Telegram Chat ID to receive Telegram job alerts.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/settings"
            className="inline-flex items-center justify-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 whitespace-nowrap"
          >
            Configure in Settings →
          </Link>
        </div>
      )}

      {/* Error state */}
      {error && <ErrorMessage message={error} />}

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
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
              className="w-full"
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
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3 border bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
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
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3 border bg-white"
            >
              <option value="all">All Channels</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
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
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1.5 px-3 border bg-white"
              >
                <option value="all">All Companies</option>
                {availableCompanies.map(c => (
                  <option key={c} value={c}>{c}</option>
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
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1.5 px-3 border bg-white"
              >
                <option value="all">All Profiles</option>
                {availableProfiles.map(p => (
                  <option key={p} value={p}>{p}</option>
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
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs py-1.5 px-3 border bg-white"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {/* Clear Filters */}
          {isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs py-1 px-2.5 h-auto text-gray-600"
            >
              Clear filters
            </Button>
          )}

          <div className="ml-auto text-xs text-gray-500">
            Showing {filteredNotifications.length} of {notifications.length} notifications
          </div>
        </div>
      </div>

      {/* Global feedback banner for retrying */}
      {retryFeedback && (
        <div
          className={`p-3 rounded-md text-sm ${
            retryFeedback.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {retryFeedback.message}
        </div>
      )}

      {/* List / Empty States */}
      {notifications.length === 0 ? (
        /* Empty state: No notifications at all */
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-2xl mb-4">
            🔔
          </div>
          <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-sm">
            Notifications will appear after matching jobs are detected and delivered.
          </p>
          <Link
            to="/dashboard/jobs"
            className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Browse matching jobs →
          </Link>
        </div>
      ) : filteredNotifications.length === 0 ? (
        /* Empty state: Filters yielded zero results */
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900">No notifications match your current filters</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search keywords, status filter, or company selection.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="mt-4"
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
                className="hover:border-blue-300 transition-colors shadow-sm cursor-pointer"
                onClick={() => setSelectedNotification(notification)}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Company & Profile Tags */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {notification.company_name || 'Unknown Company'}
                        </span>
                        {notification.watch_profile_name && (
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                            Profile: {notification.watch_profile_name}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded capitalize">
                          {notification.channel}
                        </span>
                      </div>

                      {/* Job Title */}
                      <h3 className="text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors break-words">
                        {notification.job_title || 'Job Posting'}
                      </h3>

                      {/* Timestamps */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        {notification.status === 'sent' && notification.sent_at ? (
                          <span>Sent: {formatDate(notification.sent_at)}</span>
                        ) : (
                          <span>Created: {formatDate(notification.created_at)}</span>
                        )}
                      </div>

                      {/* Failure message preview if failed */}
                      {notification.status === 'failed' && notification.error_message && (
                        <div className="mt-2 text-xs text-red-700 bg-red-50 p-2 rounded border border-red-100 break-words">
                          <span className="font-semibold">Failure reason: </span>
                          {notification.error_message}
                        </div>
                      )}
                    </div>

                    {/* Status badge & Action buttons */}
                    <div
                      className="flex flex-row sm:flex-col items-end sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100"
                      onClick={e => e.stopPropagation()}
                    >
                      <div>{renderStatusBadge(notification.status)}</div>

                      <div className="flex items-center gap-2 mt-1">
                        {notification.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs py-1 px-2.5 h-auto"
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
                            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                          >
                            Apply ↗
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs py-1 px-2 h-auto text-blue-600"
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
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 rounded-lg sm:px-6 shadow-sm">
          <div className="text-sm text-gray-700">
            Page <span className="font-medium">{currentPage}</span> of{' '}
            <span className="font-medium">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedNotification && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={() => setSelectedNotification(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-modal-title"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  {selectedNotification.company_name || 'Unknown Company'}
                </span>
                <h2 id="notification-modal-title" className="text-xl font-bold text-gray-900 mt-0.5">
                  {selectedNotification.job_title || 'Job Posting'}
                </h2>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-semibold leading-none p-1"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {renderStatusBadge(selectedNotification.status)}
                <span className="text-xs bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded capitalize">
                  Channel: {selectedNotification.channel}
                </span>
                {selectedNotification.watch_profile_name && (
                  <span className="text-xs bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded">
                    Profile: {selectedNotification.watch_profile_name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div>
                  <span className="text-gray-500 font-medium">Created Time:</span>
                  <p className="text-gray-900 mt-0.5">{formatDate(selectedNotification.created_at)}</p>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Sent Time:</span>
                  <p className="text-gray-900 mt-0.5">{formatDate(selectedNotification.sent_at)}</p>
                </div>
                {selectedNotification.recipient && (
                  <div>
                    <span className="text-gray-500 font-medium">Recipient Destination:</span>
                    <p className="text-gray-900 mt-0.5 font-mono">{selectedNotification.recipient}</p>
                  </div>
                )}
              </div>

              {/* Failure message if failed */}
              {selectedNotification.status === 'failed' && selectedNotification.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                  <span className="font-semibold text-red-800 block mb-1">✕ Failure Reason</span>
                  <p className="text-red-700 font-mono text-xs break-words">
                    {selectedNotification.error_message}
                  </p>
                </div>
              )}

              {/* Match Reason Context */}
              {(selectedNotification.match_reason || selectedNotification.match_score !== undefined) && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                  <span className="font-semibold text-blue-900 block mb-1">Why this job matched</span>
                  {selectedNotification.match_score !== undefined && selectedNotification.match_score !== null && (
                    <p className="text-xs text-blue-700 mb-1">
                      Confidence Score: <span className="font-bold">{Math.round(selectedNotification.match_score * 100)}%</span>
                    </p>
                  )}
                  {selectedNotification.match_reason && (
                    <p className="text-xs text-blue-800 whitespace-pre-wrap">
                      {selectedNotification.match_reason}
                    </p>
                  )}
                </div>
              )}

              {/* Alert Content Preview */}
              {selectedNotification.message && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase block mb-1">Message Preview</span>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedNotification.message}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t pt-4">
              <Link
                to={`/dashboard/notifications/${selectedNotification.id}`}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Open Full Detail Page →
              </Link>
              <div className="flex items-center gap-2">
                {selectedNotification.status === 'failed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetry(selectedNotification.id)}
                    isLoading={retryingId === selectedNotification.id}
                    disabled={retryingId === selectedNotification.id}
                  >
                    Retry Delivery
                  </Button>
                )}
                {(selectedNotification.apply_url || selectedNotification.source_url) && (
                  <a
                    href={selectedNotification.apply_url || selectedNotification.source_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
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
