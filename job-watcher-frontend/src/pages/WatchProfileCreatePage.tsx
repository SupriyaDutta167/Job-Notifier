import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { api, ApiError } from '../lib/api';
import { WatchProfile } from '../types';

export const WatchProfileCreatePage: React.FC = () => {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Profile name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api.post<WatchProfile>('/api/v1/watch-profiles', {
        name: name.trim(),
        is_active: isActive
      });
      navigate(`/dashboard/watch-profiles/${data.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while creating the profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create Watch Profile</h1>
          <p className="text-sm text-gray-500">Set up a new job monitoring configuration</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/watch-profiles')}>Back</Button>
      </div>

      {error && <ErrorMessage message={error} />}

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Profile Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. India SDE Internships"
                disabled={loading}
                required
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active (Monitor this profile)</Label>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" isLoading={loading}>
                Create Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
