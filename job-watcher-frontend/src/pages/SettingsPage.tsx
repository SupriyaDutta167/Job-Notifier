import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { User } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [telegramChatId, setTelegramChatId] = useState('');
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);

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
      const data = await api.patch<User>('/api/v1/me', {
        telegram_chat_id: telegramChatId.trim() || null
      });
      setProfile(data);
      if (data.telegram_chat_id) {
        setTelegramChatId(data.telegram_chat_id);
      }
    } catch (err: any) {
      setTelegramError(err.message || 'Failed to update settings');
    } finally {
      setIsSavingTelegram(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

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
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Configure external services.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="block text-sm font-medium text-gray-700">Telegram Alerting</span>
              <span className="block text-sm text-gray-500 mt-1">Receive job matches via Telegram</span>
            </div>
            {profile?.telegram_chat_id ? (
              <Badge variant="success">Configured</Badge>
            ) : (
              <Badge variant="warning">Not Configured</Badge>
            )}
          </div>
          
          <form onSubmit={handleTelegramSubmit} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="telegramChatId" className="block text-sm font-medium text-gray-700">Telegram Chat ID</label>
              <input 
                id="telegramChatId"
                type="text" 
                value={telegramChatId} 
                onChange={e => setTelegramChatId(e.target.value)}
                placeholder="e.g. 123456789"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
              <p className="mt-1 text-xs text-gray-500">Enter the chat ID of the Telegram conversation where Job Watcher should send alerts.</p>
            </div>
            {telegramError && <p className="text-sm text-red-600">{telegramError}</p>}
            <button 
              type="submit" 
              disabled={isSavingTelegram}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSavingTelegram ? 'Saving...' : 'Save Telegram Settings'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
