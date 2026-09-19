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
        <Spinner className="h-8 w-8 text-cyan-400" />
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard/notifications')}
          className="text-cyan-400 hover:text-cyan-300 font-mono text-xs mb-2"
        >
          ← Back to Notifications
        </Button>
        <ErrorMessage message={error || 'Notification not found'} />
      </div>
    );
  }

  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-mono font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
            ✓ Sent
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-mono font-bold bg-red-950/60 border border-red-500/40 text-red-400">
            ✕ Failed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-mono font-bold bg-amber-950/60 border border-amber-500/40 text-amber-400">
            ⏳ Pending
          </span>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const targetUrl = notification.apply_url || notification.source_url;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
        <Link
          to="/dashboard/notifications"
          className="inline-flex items-center text-xs font-mono text-cyan-400 hover:text-cyan-300 font-medium"
        >
          ← Back to Notifications
        </Link>
        <div className="flex items-center gap-2.5">
          {notification.status === 'failed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              isLoading={retrying}
              disabled={retrying}
              className="border-red-500/30 text-red-300 hover:bg-red-950/40 text-xs font-mono"
            >
              Retry Delivery
            </Button>
          )}
          {targetUrl && (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-cyan-500 py-1.5 px-3.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
            >
              Apply / View Job ↗
            </a>
          )}
        </div>
      </div>

      {retryMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-mono border ${
            retryMessage.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
              : 'bg-red-950/40 text-red-300 border-red-500/30'
          }`}
        >
          {retryMessage.text}
        </div>
      )}

      <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
        <CardHeader className="border-b border-slate-800/60 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400 block">
                {notification.company_name || 'Unknown Company'}
              </span>
              <CardTitle className="text-2xl mt-1 text-white font-sans">
                {notification.job_title || 'Job Posting'}
              </CardTitle>
            </div>
            <div>{renderStatusBadge(notification.status)}</div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 font-mono text-xs">
            <div>
              <span className="block text-slate-500 uppercase">Channel</span>
              <span className="block text-sky-400 mt-0.5 capitalize font-semibold">
                {notification.channel}
              </span>
            </div>
            <div>
              <span className="block text-slate-500 uppercase">Watch Profile</span>
              <span className="block text-white mt-0.5 font-semibold">
                {notification.watch_profile_name || '—'}
              </span>
            </div>
            <div>
              <span className="block text-slate-500 uppercase">Created Time</span>
              <span className="block text-slate-300 mt-0.5">
                {formatDate(notification.created_at)}
              </span>
            </div>
            <div>
              <span className="block text-slate-500 uppercase">Sent Time</span>
              <span className="block text-slate-300 mt-0.5">
                {formatDate(notification.sent_at)}
              </span>
            </div>
            {notification.recipient && (
              <div>
                <span className="block text-slate-500 uppercase">Recipient Destination</span>
                <span className="block text-cyan-400 mt-0.5">
                  {notification.recipient}
                </span>
              </div>
            )}
          </div>

          {/* Failure reason if failed */}
          {notification.status === 'failed' && notification.error_message && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 font-mono text-xs">
              <h4 className="font-semibold text-red-300 flex items-center gap-1.5 mb-1.5 text-sm">
                <span>✕</span> Delivery Failure Reason
              </h4>
              <p className="text-red-300/90 break-words">
                {notification.error_message}
              </p>
            </div>
          )}

          {/* Match context */}
          {(notification.match_reason || notification.match_score !== undefined) && (
            <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-5 font-mono text-xs space-y-2">
              <h4 className="text-sm font-semibold text-cyan-300 font-sans">
                Why this job matched {notification.watch_profile_name ? `"${notification.watch_profile_name}"` : 'your profile'}
              </h4>
              {notification.match_score !== undefined && notification.match_score !== null && (
                <div className="text-slate-300">
                  <span>Match Confidence Score: </span>
                  <span className="font-bold text-emerald-400">
                    {Math.round(notification.match_score * 100)}%
                  </span>
                </div>
              )}
              {notification.match_reason && (
                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {notification.match_reason}
                </p>
              )}
            </div>
          )}

          {/* Notification Message preview */}
          {notification.message && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Alert Message Content</h4>
              <div className="bg-slate-950 border border-slate-800 text-slate-200 p-4 rounded-xl font-mono text-xs whitespace-pre-wrap overflow-x-auto">
                {notification.message}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationDetailPage;
