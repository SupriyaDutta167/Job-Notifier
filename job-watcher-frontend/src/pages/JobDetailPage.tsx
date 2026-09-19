import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { Job, Company } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

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
        
        // Fetch Job
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
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard/jobs" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
          ← Back to Jobs
        </Link>
        <div className="bg-red-50 p-4 rounded-md border border-red-200">
          <p className="text-red-700">{error || 'Job not found'}</p>
        </div>
      </div>
    );
  }

  const postedDate = job.posted_at ? new Date(job.posted_at).toLocaleDateString() : null;
  const firstSeenDate = new Date(job.first_seen_at).toLocaleDateString();

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard/jobs" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium mb-4 inline-block">
          ← Back to Jobs
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{job.title}</h1>
          <div className="mt-1 flex flex-wrap gap-2 items-center text-sm text-gray-500">
            {company ? (
              <span className="font-medium text-gray-900">{company.name}</span>
            ) : (
              <span>Unknown Company</span>
            )}
            
            {job.location && (
              <>
                <span>&bull;</span>
                <span>{job.location}</span>
              </>
            )}

            {postedDate && (
              <>
                <span>&bull;</span>
                <span>Posted {postedDate}</span>
              </>
            )}
            
            {!postedDate && (
              <>
                <span>&bull;</span>
                <span>Discovered {firstSeenDate}</span>
              </>
            )}
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline">{job.source}</Badge>
            {job.job_type && <Badge variant="success">{job.job_type}</Badge>}
            {!job.is_active && <Badge variant="error">Inactive</Badge>}
          </div>
        </div>

        <div className="shrink-0">
          {job.apply_url ? (
            <a 
              href={job.apply_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button size="lg">Apply External</Button>
            </a>
          ) : job.source_url ? (
            <a 
              href={job.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button size="lg" variant="outline">View Source</Button>
            </a>
          ) : null}
        </div>
      </div>

      {job.description && (
        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
          </CardHeader>
          <CardContent>
            {/* The prompt specifically asks to treat description as untrusted. 
                We render it as plain text in pre-wrap, NOT dangerouslySetInnerHTML */}
            <div className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {job.description}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
