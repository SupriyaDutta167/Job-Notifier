import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { User, WatchProfile } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [watchProfiles, setWatchProfiles] = useState<WatchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meData, profilesData] = await Promise.all([
          api.get<User>('/api/v1/me'),
          api.get<WatchProfile[]>('/api/v1/watch-profiles').catch(() => [])
        ]);
        setProfile(meData);
        setWatchProfiles(profilesData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-800">
        <h3 className="text-sm font-medium">Error loading dashboard</h3>
        <div className="mt-2 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back, {profile?.email || user?.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Watch Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{watchProfiles.length}</div>
            <p className="text-xs text-gray-500">Active monitoring setups</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Telegram Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.telegram_chat_id ? (
              <div className="flex items-center space-x-2">
                <Badge variant="success">Configured</Badge>
                <span className="text-sm text-gray-600">{profile.telegram_username}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Badge variant="warning">Not Configured</Badge>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">Get instant notifications</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
