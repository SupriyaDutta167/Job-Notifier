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

  useEffect(() => {
    api.get<User>('/api/v1/me')
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
          <div className="flex justify-between items-center">
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
        </CardContent>
      </Card>
    </div>
  );
};
