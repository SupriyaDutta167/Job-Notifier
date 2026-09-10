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
import { WatchProfile, WatchRule, WatchProfileCompany } from '../types';
import { TagInput } from '../components/ui/TagInput';
import { AddCompanyModal } from '../components/ui/AddCompanyModal';

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

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [profileData, companiesData, ruleData] = await Promise.all([
        api.get<WatchProfile>(`/api/v1/watch-profiles/${id}`),
        api.get<WatchProfileCompany[]>(`/api/v1/watch-profiles/${id}/companies`).catch(() => []),
        api.get<WatchRule>(`/api/v1/watch-profiles/${id}/rules`).catch((err) => {
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        })
      ]);

      setProfile(profileData);
      setProfileName(profileData.name);
      setProfileActive(profileData.is_active);

      setCompanies(companiesData);

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
      const data = await api.patch<WatchProfile>(`/api/v1/watch-profiles/${profile.id}`, {
        name: profileName,
        is_active: profileActive
      });
      setProfile(data);
      alert('Profile details saved successfully.');
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.message);
      }
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
      alert('Matching rules saved successfully.');
    } catch (err) {
      if (err instanceof ApiError) alert(err.message);
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
    return <div className="flex h-64 items-center justify-center"><Spinner className="h-8 w-8 text-blue-600" /></div>;
  }

  if (error === 'Watch profile not found') {
    return (
      <div className="space-y-4 text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Watch profile not found</h2>
        <Button onClick={() => navigate('/dashboard/watch-profiles')}>Return to Profiles</Button>
      </div>
    );
  }

  if (error || !profile) {
    return <ErrorMessage message={error || 'Failed to load profile'} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            {profile.name}
            <Badge variant={profile.is_active ? 'success' : 'default'}>
              {profile.is_active ? 'Active' : 'Paused'}
            </Badge>
          </h1>
          <p className="text-sm text-gray-500">Configure your job monitoring requirements</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/watch-profiles')}>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="name">Profile Name</Label>
              <Input
                id="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. India SDE Internships"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={profileActive}
                onChange={(e) => setProfileActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
            </div>
            <div>
              <Button onClick={handleSaveProfile} isLoading={isSavingProfile}>Save Profile</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Monitored Companies</CardTitle>
          <Button size="sm" onClick={() => setIsCompanyModalOpen(true)}>+ Add Company</Button>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center border rounded border-dashed">
              No companies added yet. Add a company to monitor its career page.
            </p>
          ) : (
            <div className="space-y-3">
              {companies.map(company => (
                <div key={company.id} className="flex justify-between items-center p-3 border rounded-md bg-gray-50">
                  <div className="truncate pr-4">
                    <p className="font-medium text-sm text-gray-900 truncate" title={company.career_url}>{company.career_url}</p>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => handleRemoveCompany(company.id)}>Remove</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Matching Rules</CardTitle>
          {rule && <Button variant="danger" size="sm" onClick={handleDeleteRule} isLoading={isDeletingRule}>Delete Rules</Button>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="jobType">Job Type</Label>
            <Input
              id="jobType"
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              placeholder="e.g. Internship, Full-time"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Roles (e.g. SDE, SWE, Software Engineer)</Label>
            <TagInput tags={roleKeywords} onChange={setRoleKeywords} placeholder="Type role and press Enter" />
          </div>

          <div className="space-y-2">
            <Label>Locations (e.g. India, Remote, Bengaluru)</Label>
            <TagInput tags={locationKeywords} onChange={setLocationKeywords} placeholder="Type location and press Enter" />
          </div>

          <div className="space-y-2">
            <Label>Include Keywords (e.g. Backend, Cloud)</Label>
            <TagInput tags={includeKeywords} onChange={setIncludeKeywords} placeholder="Must have keywords" />
          </div>

          <div className="space-y-2">
            <Label>Exclude Keywords (e.g. Senior, Manager)</Label>
            <TagInput tags={excludeKeywords} onChange={setExcludeKeywords} placeholder="Must NOT have keywords" />
          </div>

          <div className="pt-2">
            <Button onClick={handleSaveRule} isLoading={isSavingRule}>Save Rules</Button>
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
