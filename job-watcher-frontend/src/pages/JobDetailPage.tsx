import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { Job, Company } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { 
  Building2, 
  MapPin, 
  ExternalLink, 
  FileText
} from 'lucide-react';

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
      <div className="space-y-4 max-w-5xl mx-auto">
        <Link to="/dashboard/jobs" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-xs font-medium inline-block">
          &larr; Back to Jobs
        </Link>
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Link to="/dashboard/jobs" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-xs font-medium inline-block">
          &larr; Back to Jobs
        </Link>
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-5 text-center backdrop-blur-sm">
          <p className="text-red-400 font-semibold text-sm">{error || 'Job not found'}</p>
        </div>
      </div>
    );
  }

  const postedDate = formatDate(job.posted_at);
  const firstSeenDate = formatDate(job.first_seen_at) || 'Recently';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link to="/dashboard/jobs" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-xs font-medium inline-block">
          &larr; Back to Jobs
        </Link>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400 block">
              {company ? company.name : 'Unknown Company'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white break-words font-sans">
            {job.title}
          </h1>
          
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 items-center text-xs font-mono text-slate-400">
            {job.location && (
              <span className="font-medium text-slate-200 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-500" />
                {job.location}
              </span>
            )}
            {job.job_type && (
              <>
                <span>&bull;</span>
                <span className="text-slate-300">{job.job_type}</span>
              </>
            )}
            <span>&bull;</span>
            <Badge variant="outline" className="text-[11px] bg-slate-950 border-slate-800 text-slate-300">
              {job.source}
            </Badge>
            
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
                <Badge variant="error" className="text-[11px]">Inactive</Badge>
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
              <Button
                size="lg"
                className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20"
              >
                Apply External
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          ) : job.source_url ? (
            <a 
              href={job.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block w-full sm:w-auto"
            >
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-800 text-slate-300 hover:text-white">
                View Source
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          ) : null}
        </div>
      </div>

      {/* Match Context Section */}
      <Card className="border-cyan-500/30 bg-slate-900/80 shadow-lg">
        <CardHeader className="pb-3 border-b border-slate-800/80">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              Why this job matched
            </CardTitle>
            {job.matches && job.matches.length > 0 && (
              <span className="text-xs font-mono font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                {job.matches.length} {job.matches.length === 1 ? 'Matched Profile' : 'Matched Profiles'}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {(!job.matches || job.matches.length === 0) ? (
            <div className="text-xs font-mono text-slate-400 py-4 text-center sm:text-left bg-slate-950/40 p-4 rounded-xl border border-slate-800">
              No match information is available for this job.
            </div>
          ) : (
            <div className="space-y-3">
              {job.matches.map(m => (
                <div key={m.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-semibold text-white text-sm font-sans">
                      {m.profile_name}
                    </span>
                    <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      {formatMatchScore(m.score)} Match
                    </span>
                  </div>
                  
                  {m.match_reason && (
                    <div className="text-xs font-mono text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 space-y-1">
                      <p className="leading-relaxed">
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
        <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
          <CardHeader className="border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-400" />
              <CardTitle className="text-base font-semibold text-white">Job Description</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Treat external career site description as untrusted text. No dangerouslySetInnerHTML */}
            <div className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed break-words bg-slate-950/40 p-5 rounded-xl border border-slate-800/60">
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
            <Button
              size="lg"
              className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20"
            >
              Apply on {company?.name || 'Company Site'}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      )}
    </div>
  );
};

export default JobDetailPage;
