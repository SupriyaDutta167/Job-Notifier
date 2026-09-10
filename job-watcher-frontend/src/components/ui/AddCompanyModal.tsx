import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
import { ErrorMessage } from './ErrorMessage';
import { api, ApiError } from '../../lib/api';
import { Company } from '../../types';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  profileId: string;
}

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ isOpen, onClose, onSuccess, profileId }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab state: 'select' | 'create'
  const [mode, setMode] = useState<'select' | 'create'>('select');

  // Form states
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [careerUrl, setCareerUrl] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCompanies();
      setCareerUrl('');
      setSelectedCompanyId('');
      setNewCompanyName('');
      setError(null);
    }
  }, [isOpen]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await api.get<Company[]>('/api/v1/companies');
      setCompanies(data);
      if (data.length > 0) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (err) {
      // Failed to load
    } finally {
      setLoading(false);
    }
  };

  const validateUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateUrl(careerUrl)) {
      setError('Career URL must be a valid http or https URL.');
      return;
    }

    try {
      setIsSubmitting(true);
      let companyId = selectedCompanyId;

      if (mode === 'create') {
        if (!newCompanyName.trim()) {
          setError('Company name is required.');
          setIsSubmitting(false);
          return;
        }
        const createdCompany = await api.post<Company>('/api/v1/companies', {
          name: newCompanyName.trim()
        });
        companyId = createdCompany.id;
      }

      await api.post(`/api/v1/watch-profiles/${profileId}/companies`, {
        company_id: companyId,
        career_url: careerUrl,
        is_active: true
      });

      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('This career URL is already being monitored in this profile.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add Monitored Company</CardTitle>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
        </CardHeader>
        <CardContent>
          {error && <ErrorMessage message={error} />}

          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`py-2 px-4 focus:outline-none ${mode === 'select' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500'}`}
              onClick={() => setMode('select')}
            >
              Select Existing
            </button>
            <button
              className={`py-2 px-4 focus:outline-none ${mode === 'create' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-500'}`}
              onClick={() => setMode('create')}
            >
              Create New
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'select' && (
              <div className="space-y-2">
                <Label htmlFor="company_id">Company</Label>
                {loading ? (
                  <p className="text-sm text-gray-500">Loading companies...</p>
                ) : (
                  <select
                    id="company_id"
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {mode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="new_company_name">Company Name</Label>
                <Input
                  id="new_company_name"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="career_url">Career URL</Label>
              <Input
                id="career_url"
                value={careerUrl}
                onChange={(e) => setCareerUrl(e.target.value)}
                placeholder="https://company.com/careers"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Paste the company's public careers/jobs page. Job Watcher automatically detects the source.</p>
            </div>

            <div className="pt-4 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting} disabled={loading && mode === 'select'}>
                Save Association
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
