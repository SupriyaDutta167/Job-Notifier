import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { User } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';

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
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  const isTelegramConfigured = Boolean(profile?.telegram_chat_id && profile.telegram_chat_id.trim());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Your personal account information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="block text-sm font-medium text-gray-700">Email</span>
            <span className="block text-sm text-gray-900 mt-1">{profile?.email || user?.email}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Telegram Notifications</CardTitle>
              <CardDescription>Configure Telegram alerts for matching job postings.</CardDescription>
            </div>
            <div>
              {isTelegramConfigured ? (
                <Badge variant="success">Configured</Badge>
              ) : (
                <Badge variant="warning">Not Configured</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isTelegramConfigured && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800">
              Configure your Telegram Chat ID to receive Telegram job alerts.
            </div>
          )}

          <form onSubmit={handleTelegramSubmit} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="telegramChatId" className="block text-sm font-medium text-gray-700">
                Telegram Chat ID
              </label>
              <input 
                id="telegramChatId"
                type="text" 
                value={telegramChatId} 
                onChange={e => setTelegramChatId(e.target.value)}
                placeholder="e.g. 123456789"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter your numeric Telegram Chat ID or group chat ID to receive instant alerts.
              </p>
            </div>

            {telegramError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                {telegramError}
              </div>
            )}

            {telegramSuccess && (
              <div className="p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">
                {telegramSuccess}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button 
                type="submit" 
                disabled={isSavingTelegram}
                isLoading={isSavingTelegram}
              >
                {isSavingTelegram ? 'Saving...' : 'Save Chat ID'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleTestTelegram}
                disabled={!isTelegramConfigured || isTestingTelegram}
                isLoading={isTestingTelegram}
              >
                {isTestingTelegram ? 'Sending test message...' : 'Test Telegram'}
              </Button>
            </div>
          </form>

          {/* Test Telegram Result */}
          {testResult && (
            <div
              className={`max-w-md p-3 rounded-md text-sm ${
                testResult.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
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
