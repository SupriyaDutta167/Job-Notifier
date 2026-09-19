import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { User } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { 
  Send, 
  User as UserIcon, 
  AlertCircle
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [telegramChatId, setTelegramChatId] = useState('');
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramSuccess, setTelegramSuccess] = useState<string | null>(null);

  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    api.get<User>('/api/v1/me')
      .then((data) => {
        setProfile(data);
        if (data.telegram_chat_id) {
          setTelegramChatId(data.telegram_chat_id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleTelegramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingTelegram(true);
      setTelegramError(null);
      setTelegramSuccess(null);
      setTestResult(null);

      const trimmed = telegramChatId.trim();
      const data = await api.patch<User>('/api/v1/me', {
        telegram_chat_id: trimmed || null
      });
      setProfile(data);
      if (data.telegram_chat_id) {
        setTelegramChatId(data.telegram_chat_id);
      } else {
        setTelegramChatId('');
      }
      setTelegramSuccess('Chat ID saved successfully.');
    } catch (err: any) {
      setTelegramError(err.message || 'Failed to update settings');
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleTestTelegram = async () => {
    try {
      setIsTestingTelegram(true);
      setTestResult(null);
      const res = await api.post<{ success: boolean; message: string }>('/api/v1/me/telegram/test');
      setTestResult({
        type: 'success',
        message: res.message || 'Test message sent successfully.'
      });
    } catch (err: any) {
      setTestResult({
        type: 'error',
        message: err.message || 'Failed to send test message'
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-cyan-400" />
      </div>
    );
  }

  const isTelegramConfigured = Boolean(profile?.telegram_chat_id && profile.telegram_chat_id.trim());

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
            System Preferences
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl font-sans">Settings</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">Manage your account and preferences</p>
      </div>

      {/* Account Details Card */}
      <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
        <CardHeader className="border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-base font-semibold text-white">Account Details</CardTitle>
          </div>
          <CardDescription className="text-xs font-mono text-slate-400">
            Your personal account information.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <span className="block text-slate-500 uppercase">Email</span>
              <span className="block text-white font-semibold mt-1">{profile?.email || user?.email}</span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <span className="block text-slate-500 uppercase">Session Security</span>
              <span className="text-emerald-400 font-semibold mt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Active &amp; Protected
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telegram Notifications Card */}
      <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
        <CardHeader className="border-b border-slate-800/60 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-cyan-400" />
                <CardTitle className="text-base font-semibold text-white">Telegram Notifications</CardTitle>
              </div>
              <CardDescription className="text-xs font-mono text-slate-400 mt-1">
                Configure Telegram alerts for matching job postings.
              </CardDescription>
            </div>
            <div>
              {isTelegramConfigured ? (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                  Configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold bg-amber-950/60 border border-amber-500/40 text-amber-400">
                  Not Configured
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {!isTelegramConfigured && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                Configure your Telegram Chat ID to receive Telegram job alerts.
              </div>
            </div>
          )}

          <form onSubmit={handleTelegramSubmit} className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <label htmlFor="telegramChatId" className="block text-xs font-mono text-slate-300">
                Telegram Chat ID
              </label>
              <input 
                id="telegramChatId"
                type="text" 
                value={telegramChatId} 
                onChange={e => setTelegramChatId(e.target.value)}
                placeholder="e.g. 123456789"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
              />
              <p className="mt-1 text-[11px] font-mono text-slate-500">
                Enter your numeric Telegram Chat ID or group chat ID to receive instant alerts.
              </p>
            </div>

            {telegramError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300">
                {telegramError}
              </div>
            )}

            {telegramSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                {telegramSuccess}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button 
                type="submit" 
                disabled={isSavingTelegram}
                isLoading={isSavingTelegram}
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-md shadow-cyan-500/20"
              >
                {isSavingTelegram ? 'Saving...' : 'Save Chat ID'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestTelegram}
                disabled={!isTelegramConfigured || isTestingTelegram}
                isLoading={isTestingTelegram}
                className="border-slate-800 text-slate-300 hover:text-white"
              >
                {isTestingTelegram ? 'Sending test message...' : 'Test Telegram'}
              </Button>
            </div>
          </form>

          {/* Test Telegram Result */}
          {testResult && (
            <div
              className={`max-w-md p-3.5 rounded-xl text-xs font-mono border ${
                testResult.type === 'success'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                  : 'bg-red-950/40 text-red-300 border-red-500/30'
              }`}
            >
              {testResult.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
