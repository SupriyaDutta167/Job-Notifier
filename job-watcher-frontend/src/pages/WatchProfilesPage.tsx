import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { api, ApiError } from '../lib/api';
import { WatchProfile } from '../types';
import { Badge } from '../components/ui/Badge';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { EmptyState } from '../components/ui/EmptyState';
import { Search, Plus, Radio, Settings, Play, Pause, Trash2 } from 'lucide-react';

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

  const activeCount = profiles.filter(p => p.is_active).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
              Telemetry Targeting
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl font-sans">
            Watch Profiles
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Manage your job search queries and alerts &bull; <span className="font-mono text-cyan-300">{activeCount} of {profiles.length} Active</span>
          </p>
        </div>
        <Button
          onClick={() => navigate('/dashboard/watch-profiles/new')}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Create Profile
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No watch profiles yet"
          description="Create your first watch profile to start monitoring jobs."
          actionLabel="Create Watch Profile"
          onAction={() => navigate('/dashboard/watch-profiles/new')}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map(profile => (
            <Card
              key={profile.id}
              className="border-slate-800/80 bg-slate-900/70 hover:border-slate-700/90 transition-all duration-200 group flex flex-col justify-between"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Radio className={`h-3.5 w-3.5 ${profile.is_active ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                          {profile.is_active ? 'Online Monitor' : 'Paused Agent'}
                        </span>
                      </div>
                      <h3
                        className="mt-1 text-base font-semibold text-white truncate group-hover:text-cyan-300 transition-colors"
                        title={profile.name}
                      >
                        {profile.name}
                      </h3>
                    </div>
                    <Badge variant={profile.is_active ? 'success' : 'default'} className="shrink-0 font-mono text-[11px]">
                      {profile.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-800/60 bg-slate-950/40 p-2.5 font-mono text-[11px] text-slate-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">PROFILE ID:</span>
                      <span className="text-slate-300">{profile.id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">DISPATCH:</span>
                      <span className="text-sky-400">Telegram Instant</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-800/60">
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/dashboard/watch-profiles/${profile.id}`)}
                      className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
                    >
                      <Settings className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleToggleActive(profile)}
                      className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
                    >
                      {profile.is_active ? (
                        <>
                          <Pause className="mr-1 h-3 w-3 text-amber-400" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 h-3 w-3 text-emerald-400" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(profile.id)}
                    className="text-xs"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
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
