import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { api, ApiError } from '../lib/api';
import { WatchProfile } from '../types';
import { Badge } from '../components/ui/Badge';
import { ErrorMessage } from '../components/ui/ErrorMessage';

export const WatchProfilesPage: React.FC = () => {
  const [profiles, setProfiles] = useState<WatchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<WatchProfile[]>('/api/v1/watch-profiles');
      setProfiles(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while loading profiles.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleToggleActive = async (profile: WatchProfile) => {
    try {
      const updatedProfile = await api.patch<WatchProfile>(`/api/v1/watch-profiles/${profile.id}`, {
        is_active: !profile.is_active
      });
      setProfiles(profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p));
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      }
    }
  };

  const handleDelete = async (profileId: string) => {
    if (!window.confirm('Delete this watch profile? Removing a profile stops monitoring that configuration.')) {
      return;
    }
    
    try {
      await api.delete(`/api/v1/watch-profiles/${profileId}`);
      setProfiles(profiles.filter(p => p.id !== profileId));
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Watch Profiles</h1>
          <p className="text-sm text-gray-500">Manage your job search queries and alerts</p>
        </div>
        <Button onClick={() => navigate('/dashboard/watch-profiles/new')}>Create Profile</Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium text-gray-900">No watch profiles yet</h3>
              <p className="text-sm text-gray-500">Create your first watch profile to start monitoring jobs.</p>
              <Button onClick={() => navigate('/dashboard/watch-profiles/new')} className="mt-4">
                Create Watch Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map(profile => (
            <Card key={profile.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold truncate" title={profile.name}>{profile.name}</h3>
                  <Badge variant={profile.is_active ? 'success' : 'default'}>
                    {profile.is_active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center mt-6">
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/watch-profiles/${profile.id}`)}>
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleToggleActive(profile)}
                    >
                      {profile.is_active ? 'Pause' : 'Activate'}
                    </Button>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(profile.id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
