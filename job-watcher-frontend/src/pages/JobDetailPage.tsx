import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { Job, Company } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export const formatMatchScore = (score: number): string => {
  if (score <= 1.0) {
    return `${Math.round(score * 100)}%`;
  }
  return `${Math.round(score)}%`;
};

export const formatDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return null;
  }
};

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobAndCompany = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch Job with user-scoped match details
        const fetchedJob = await api.get<Job>(`/api/v1/jobs/${id}`);
        setJob(fetchedJob);
        
        // Fetch Company
        if (fetchedJob.company_id) {
          const fetchedCompany = await api.get<Company>(`/api/v1/companies/${fetchedJob.company_id}`);
          setCompany(fetchedCompany);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError('Job not found');
        } else {
          setError(err instanceof Error ? err.message : 'An error occurred loading the job.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchJobAndCompany();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/jobs" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium inline-block">
          ← Back to Jobs
        </Link>
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/jobs" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium inline-block">
          ← Back to Jobs
        </Link>
        <div className="bg-red-50 p-4 rounded-md border border-red-200">
          <p className="text-red-700 font-medium">{error || 'Job not found'}</p>
        </div>
      </div>
    );
  }

  const postedDate = formatDate(job.posted_at);
  const firstSeenDate = formatDate(job.first_seen_at) || 'Recently';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link to="/dashboard/jobs" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium inline-block">
          ← Back to Jobs
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 pb-2 border-b border-gray-100">
        <div className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600 block">
            {company ? company.name : 'Unknown Company'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 break-words">{job.title}</h1>
          
          <div className="flex flex-wrap gap-x-3 gap-y-1 items-center text-sm text-gray-500">
            {job.location && (
              <span className="font-medium text-gray-700">
                {job.location}
              </span>
            )}
            {job.job_type && (
              <>
                <span>&bull;</span>
                <span>{job.job_type}</span>
              </>
            )}
            <span>&bull;</span>
            <Badge variant="outline" className="text-xs">{job.source}</Badge>
            
            {postedDate && (
              <>
                <span>&bull;</span>
                <span>Posted: {postedDate}</span>
              </>
            )}
            
            <span>&bull;</span>
            <span>First seen: {firstSeenDate}</span>
            
            {!job.is_active && (
              <>
                <span>&bull;</span>
                <Badge variant="error">Inactive</Badge>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3 mt-2 md:mt-0">
          {job.apply_url ? (
            <a 
              href={job.apply_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block w-full sm:w-auto"
            >
              <Button size="lg" className="w-full sm:w-auto">Apply External</Button>
            </a>
          ) : job.source_url ? (
            <a 
              href={job.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block w-full sm:w-auto"
            >
              <Button size="lg" variant="outline" className="w-full sm:w-auto">View Source</Button>
            </a>
          ) : null}
        </div>
      </div>

      {/* Match Context Section */}
      <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 shadow-sm">
        <CardHeader className="pb-3 border-b border-indigo-50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              Why this job matched
            </CardTitle>
            {job.matches && job.matches.length > 0 && (
              <span className="text-xs font-medium text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                {job.matches.length} {job.matches.length === 1 ? 'Matched Profile' : 'Matched Profiles'}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {(!job.matches || job.matches.length === 0) ? (
            <div className="text-sm text-gray-500 py-3 text-center sm:text-left bg-white/60 p-4 rounded-md border border-gray-100">
              No match information is available for this job.
            </div>
          ) : (
            <div className="space-y-4">
              {job.matches.map(m => (
                <div key={m.id} className="p-4 rounded-lg bg-white border border-gray-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-semibold text-gray-900 text-base">
                      {m.profile_name}
                    </span>
                    <Badge variant="success" className="font-semibold text-xs">
                      {formatMatchScore(m.score)} Match
                    </Badge>
                  </div>
                  
                  {m.match_reason && (
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-100 space-y-2">
                      <p className="font-medium text-gray-800 leading-relaxed">
                        {m.match_reason}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Job Description */}
      {job.description && (
        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Treat external career site description as untrusted text. No dangerouslySetInnerHTML */}
            <div className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed break-words">
              {job.description}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Apply Action */}
      {job.apply_url && (
        <div className="flex justify-end pt-2 pb-6">
          <a 
            href={job.apply_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          >
            <Button size="lg" className="w-full sm:w-auto">Apply on {company?.name || 'Company Site'}</Button>
          </a>
        </div>
      )}
    </div>
  );
};
