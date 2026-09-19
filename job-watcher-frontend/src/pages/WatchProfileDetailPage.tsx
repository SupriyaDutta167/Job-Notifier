import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { api, ApiError } from '../lib/api';
import { WatchProfile, WatchRule, WatchProfileCompany, Company } from '../types';
import { TagInput } from '../components/ui/TagInput';
import { AddCompanyModal } from '../components/ui/AddCompanyModal';
import { 
  ArrowLeft, 
  Building2, 
  Sliders, 
  Trash2, 
  Plus, 
  Save, 
  Target,
  FileCheck
} from 'lucide-react';

export const WatchProfileDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Load States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Profile Data
  const [profile, setProfile] = useState<WatchProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileActive, setProfileActive] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Monitored Companies
  const [companies, setCompanies] = useState<WatchProfileCompany[]>([]);
  const [allCompanies, setAllCompanies] = useState<Record<string, Company>>({});
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  // Watch Rule Data
  const [rule, setRule] = useState<WatchRule | null>(null);
  const [jobType, setJobType] = useState('');
  const [roleKeywords, setRoleKeywords] = useState<string[]>([]);
  const [locationKeywords, setLocationKeywords] = useState<string[]>([]);
  const [includeKeywords, setIncludeKeywords] = useState<string[]>([]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([]);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isDeletingRule, setIsDeletingRule] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [ruleFeedback, setRuleFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [profileData, companiesData, ruleData, allCompaniesData] = await Promise.all([
        api.get<WatchProfile>(`/api/v1/watch-profiles/${id}`),
        api.get<WatchProfileCompany[]>(`/api/v1/watch-profiles/${id}/companies`).catch(() => []),
        api.get<WatchRule>(`/api/v1/watch-profiles/${id}/rules`).catch((err) => {
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        }),
        api.get<Company[]>('/api/v1/companies').catch(() => [])
      ]);

      setProfile(profileData);
      setProfileName(profileData.name);
      setProfileActive(profileData.is_active);

      setCompanies(companiesData);

      const compMap: Record<string, Company> = {};
      allCompaniesData.forEach(c => {
        compMap[c.id] = c;
      });
      setAllCompanies(compMap);

      setRule(ruleData);
      if (ruleData) {
        setJobType(ruleData.job_type || '');
        setRoleKeywords(ruleData.role_keywords || []);
        setLocationKeywords(ruleData.location_keywords || []);
        setIncludeKeywords(ruleData.include_keywords || []);
        setExcludeKeywords(ruleData.exclude_keywords || []);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Watch profile not found');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while loading the profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    try {
      setIsSavingProfile(true);
      setProfileFeedback(null);
      const data = await api.patch<WatchProfile>(`/api/v1/watch-profiles/${profile.id}`, {
        name: profileName,
        is_active: profileActive
      });
      setProfile(data);
      setProfileFeedback({ type: 'success', message: 'Profile details saved successfully.' });
      setTimeout(() => setProfileFeedback(null), 4000);
    } catch (err) {
      setProfileFeedback({
        type: 'error',
        message: err instanceof ApiError ? err.message : 'Failed to save profile details.'
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRemoveCompany = async (relationshipId: string) => {
    if (!profile) return;
    if (!window.confirm('Remove this career URL from the profile?')) return;
    try {
      await api.delete(`/api/v1/watch-profiles/${profile.id}/companies/${relationshipId}`);
      setCompanies(companies.filter(c => c.id !== relationshipId));
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
    }
  };

  const handleSaveRule = async () => {
    if (!profile) return;
    try {
      setIsSavingRule(true);
      setRuleFeedback(null);
      const payload = {
        job_type: jobType || null,
        role_keywords: roleKeywords,
        location_keywords: locationKeywords,
        include_keywords: includeKeywords,
        exclude_keywords: excludeKeywords
      };

      if (rule) {
        const updatedRule = await api.patch<WatchRule>(`/api/v1/watch-profiles/${profile.id}/rules`, payload);
        setRule(updatedRule);
      } else {
        const createdRule = await api.post<WatchRule>(`/api/v1/watch-profiles/${profile.id}/rules`, payload);
        setRule(createdRule);
      }
      setRuleFeedback({ type: 'success', message: 'Matching rules saved successfully.' });
      setTimeout(() => setRuleFeedback(null), 4000);
    } catch (err) {
      setRuleFeedback({
        type: 'error',
        message: err instanceof ApiError ? err.message : 'Failed to save matching rules.'
      });
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!profile || !rule) return;
    if (!window.confirm('Delete these matching rules?')) return;
    try {
      setIsDeletingRule(true);
      await api.delete(`/api/v1/watch-profiles/${profile.id}/rules`);
      setRule(null);
      setJobType('');
      setRoleKeywords([]);
      setLocationKeywords([]);
      setIncludeKeywords([]);
      setExcludeKeywords([]);
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
    } finally {
      setIsDeletingRule(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-cyan-400" />
      </div>
    );
  }

  if (error === 'Watch profile not found') {
    return (
      <div className="space-y-4 text-center py-16">
        <h2 className="text-xl font-semibold text-white">Watch profile not found</h2>
        <p className="text-xs text-slate-400 font-mono">The requested profile identifier does not exist or has been removed.</p>
        <Button onClick={() => navigate('/dashboard/watch-profiles')} variant="outline">
          Return to Profiles
        </Button>
      </div>
    );
  }

  if (error || !profile) {
    return <ErrorMessage message={error || 'Failed to load profile'} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
              Profile Configuration
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl font-sans flex items-center gap-3">
            <span>{profile.name}</span>
            <Badge variant={profile.is_active ? 'success' : 'default'} className="font-mono text-xs">
              {profile.is_active ? 'Active' : 'Paused'}
            </Badge>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Configure your job monitoring requirements
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

      {/* Profile Details Card */}
      <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
        <CardHeader className="border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-base font-semibold text-white">Profile Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-200 text-xs font-mono">Profile Name</Label>
              <Input
                id="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. India SDE Internships"
              />
            </div>
            <div className="flex items-center space-x-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <input
                type="checkbox"
                id="is_active"
                checked={profileActive}
                onChange={(e) => setProfileActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950 cursor-pointer"
              />
              <Label htmlFor="is_active" className="cursor-pointer text-xs font-mono text-slate-300">
                Active
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleSaveProfile} isLoading={isSavingProfile} size="sm">
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Profile
              </Button>
              {profileFeedback && (
                <span className={`text-xs font-mono font-semibold ${profileFeedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {profileFeedback.type === 'success' ? '✓ ' : '✕ '}{profileFeedback.message}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monitored Companies Card */}
      <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-base font-semibold text-white">Monitored Companies</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => setIsCompanyModalOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20 text-xs"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            + Add Company
          </Button>
        </CardHeader>
        <CardContent className="pt-5">
          {companies.length === 0 ? (
            <div className="py-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
              <Building2 className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-mono text-slate-400">
                No companies added yet. Add a company to monitor its career page.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {companies.map(company => (
                <div
                  key={company.id}
                  className="flex justify-between items-center p-3 rounded-xl border border-slate-800/80 bg-slate-950/60 hover:border-slate-700/80 transition-all"
                >
                  <div className="truncate pr-4">
                    <p className="font-medium text-sm text-white truncate flex items-center gap-2">
                      {allCompanies[company.company_id]?.name && (
                        <span className="font-semibold text-cyan-300 font-mono">
                          {allCompanies[company.company_id].name}
                        </span>
                      )}
                      <span className="text-slate-500 text-xs font-mono truncate" title={company.career_url}>
                        {company.career_url}
                      </span>
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveCompany(company.id)}
                    className="text-xs"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matching Rules Card */}
      <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-base font-semibold text-white">Matching Rules</CardTitle>
          </div>
          {rule && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteRule}
              isLoading={isDeletingRule}
              className="text-xs"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete Rules
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="jobType" className="text-slate-200 text-xs font-mono">Job Type</Label>
            <Input
              id="jobType"
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              placeholder="e.g. Internship, Full-time"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-200 text-xs font-mono">Roles (e.g. SDE, SWE, Software Engineer)</Label>
            <TagInput tags={roleKeywords} onChange={setRoleKeywords} placeholder="Type role and press Enter" />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200 text-xs font-mono">Locations (e.g. India, Remote, Bengaluru)</Label>
            <TagInput tags={locationKeywords} onChange={setLocationKeywords} placeholder="Type location and press Enter" />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200 text-xs font-mono">Include Keywords (e.g. Backend, Cloud)</Label>
            <TagInput tags={includeKeywords} onChange={setIncludeKeywords} placeholder="Must have keywords" />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200 text-xs font-mono">Exclude Keywords (e.g. Senior, Manager)</Label>
            <TagInput tags={excludeKeywords} onChange={setExcludeKeywords} placeholder="Must NOT have keywords" />
          </div>

          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
            <div>
              {ruleFeedback && (
                <span className={`text-xs font-mono font-semibold ${ruleFeedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {ruleFeedback.type === 'success' ? '✓ ' : '✕ '}{ruleFeedback.message}
                </span>
              )}
            </div>
            <Button
              onClick={handleSaveRule}
              isLoading={isSavingRule}
              size="sm"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20"
            >
              <FileCheck className="mr-1.5 h-3.5 w-3.5" />
              Save Rules
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddCompanyModal 
        isOpen={isCompanyModalOpen} 
        onClose={() => setIsCompanyModalOpen(false)} 
        onSuccess={loadData} 
        profileId={profile.id} 
      />
    </div>
  );
};

export default WatchProfileDetailPage;
