import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
import { ErrorMessage } from './ErrorMessage';
import { api, ApiError } from '../../lib/api';
import { Company } from '../../types';
import { X, Building2 } from 'lucide-react';

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
        try {
          const createdCompany = await api.post<Company>('/api/v1/companies', {
            name: newCompanyName.trim()
          });
          companyId = createdCompany.id;
        } catch (compErr) {
          if (compErr instanceof ApiError && compErr.status === 409) {
            // Company with this name/slug already exists globally; reuse its ID
            const existing = companies.find(
              c => c.name.toLowerCase() === newCompanyName.trim().toLowerCase()
            );
            if (existing) {
              companyId = existing.id;
            } else {
              const allComps = await api.get<Company[]>('/api/v1/companies');
              const found = allComps.find(
                c => c.name.toLowerCase() === newCompanyName.trim().toLowerCase()
              );
              if (found) {
                companyId = found.id;
              } else {
                throw compErr;
              }
            }
          } else {
            throw compErr;
          }
        }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-base font-semibold text-white">Add Monitored Company</CardTitle>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent className="pt-4">
          {error && <ErrorMessage message={error} />}

          <div className="flex border-b border-slate-800 mb-4 font-mono text-xs">
            <button
              className={`py-2 px-4 focus:outline-none transition-all ${
                mode === 'select'
                  ? 'border-b-2 border-cyan-500 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setMode('select')}
            >
              Select Existing
            </button>
            <button
              className={`py-2 px-4 focus:outline-none transition-all ${
                mode === 'create'
                  ? 'border-b-2 border-cyan-500 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setMode('create')}
            >
              Create New
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'select' && (
              <div className="space-y-2">
                <Label htmlFor="company_id" className="text-slate-200 text-xs font-mono">Company</Label>
                {loading ? (
                  <p className="text-xs font-mono text-slate-500">Loading companies...</p>
                ) : (
                  <select
                    id="company_id"
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {mode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="new_company_name" className="text-slate-200 text-xs font-mono">Company Name</Label>
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
              <Label htmlFor="career_url" className="text-slate-200 text-xs font-mono">Career URL</Label>
              <Input
                id="career_url"
                value={careerUrl}
                onChange={(e) => setCareerUrl(e.target.value)}
                placeholder="https://company.com/careers"
                required
              />
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                Paste the company's public careers/jobs page. Job Watcher automatically detects the source.
              </p>
            </div>

            <div className="pt-4 flex justify-end space-x-2.5 border-t border-slate-800/80">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} size="sm">
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={loading && mode === 'select'}
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20"
              >
                Save Association
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
