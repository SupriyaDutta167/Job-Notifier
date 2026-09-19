import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Notification } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export const NotificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchNotification = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<Notification>(`/api/v1/notifications/${id}`);
        setNotification(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notification');
      } finally {
        setLoading(false);
      }
    };
    fetchNotification();
  }, [id]);

  const handleRetry = async () => {
    if (!notification) return;
    try {
      setRetrying(true);
      setRetryMessage(null);
      const updated = await api.post<Notification>(`/api/v1/notifications/${notification.id}/retry`);
      setNotification(updated);
      setRetryMessage({ type: 'success', text: 'Notification re-sent successfully!' });
    } catch (err) {
      setRetryMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to retry notification'
      });
    } finally {
      setRetrying(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" data-testid="notification-detail-loading">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard/notifications')} className="mb-2">
          ← Back to Notifications
        </Button>
        <ErrorMessage message={error || 'Notification not found'} />
      </div>
    );
  }

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

  const targetUrl = notification.apply_url || notification.source_url;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/notifications"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← Back to Notifications
        </Link>
        <div className="flex items-center gap-2">
          {notification.status === 'failed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              isLoading={retrying}
              disabled={retrying}
            >
              Retry Delivery
            </Button>
          )}
          {targetUrl && (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 py-1.5 px-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              Apply / View Job ↗
            </a>
          )}
        </div>
      </div>

      {retryMessage && (
        <div
          className={`p-4 rounded-md text-sm ${
            retryMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {retryMessage.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                {notification.company_name || 'Unknown Company'}
              </span>
              <CardTitle className="text-2xl mt-1">
                {notification.job_title || 'Job Posting'}
              </CardTitle>
            </div>
            <div>{renderStatusBadge(notification.status)}</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div>
              <span className="block text-xs font-medium text-gray-500 uppercase">Channel</span>
              <span className="block text-sm font-medium text-gray-900 mt-0.5 capitalize">
                {notification.channel}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500 uppercase">Watch Profile</span>
              <span className="block text-sm font-medium text-gray-900 mt-0.5">
                {notification.watch_profile_name || '—'}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500 uppercase">Created Time</span>
              <span className="block text-sm text-gray-700 mt-0.5">
                {formatDate(notification.created_at)}
              </span>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500 uppercase">Sent Time</span>
              <span className="block text-sm text-gray-700 mt-0.5">
                {formatDate(notification.sent_at)}
              </span>
            </div>
            {notification.recipient && (
              <div>
                <span className="block text-xs font-medium text-gray-500 uppercase">Recipient Destination</span>
                <span className="block text-sm text-gray-700 mt-0.5 font-mono">
                  {notification.recipient}
                </span>
              </div>
            )}
          </div>

          {/* Failure reason if failed */}
          {notification.status === 'failed' && notification.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-800 flex items-center gap-1.5 mb-1">
                <span>✕</span> Delivery Failure Reason
              </h4>
              <p className="text-sm text-red-700 break-words font-mono">
                {notification.error_message}
              </p>
            </div>
          )}

          {/* Match context */}
          {(notification.match_reason || notification.match_score !== undefined) && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Why this job matched {notification.watch_profile_name ? `"${notification.watch_profile_name}"` : 'your profile'}
              </h4>
              {notification.match_score !== undefined && notification.match_score !== null && (
                <div className="mb-2">
                  <span className="text-xs text-blue-700 font-medium">Match Confidence Score: </span>
                  <span className="text-xs font-bold text-blue-900">
                    {Math.round(notification.match_score * 100)}%
                  </span>
                </div>
              )}
              {notification.match_reason && (
                <p className="text-sm text-blue-800 whitespace-pre-wrap">
                  {notification.match_reason}
                </p>
              )}
            </div>
          )}

          {/* Notification Message preview */}
          {notification.message && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Alert Message Content</h4>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                {notification.message}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
