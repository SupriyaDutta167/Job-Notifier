import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { api, ApiError } from '../lib/api';
import { WatchProfile } from '../types';
import { ArrowLeft, Target } from 'lucide-react';

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
      {/* Page Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
              Profile Configuration
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl font-sans">
            Create Watch Profile
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Set up a new job monitoring configuration
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard/watch-profiles')}
          className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
          size="sm"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back
        </Button>
      </div>

      {error && <ErrorMessage message={error} />}

      <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
        <CardHeader className="border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-base font-semibold text-white">Profile Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-200 text-xs font-mono">Profile Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. India SDE Internships"
                disabled={loading}
                required
              />
              <p className="text-[11px] text-slate-500 font-mono">
                A descriptive title for your targeting cluster (e.g. "Backend Engineer", "SWE Intern 2026").
              </p>
            </div>
            
            <div className="flex items-center space-x-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950 cursor-pointer"
              />
              <Label htmlFor="is_active" className="cursor-pointer text-xs font-mono text-slate-300">
                Active (Monitor this profile)
              </Label>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard/watch-profiles')}
                disabled={loading}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={loading}
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20"
              >
                Create Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default WatchProfileCreatePage;
