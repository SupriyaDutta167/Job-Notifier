import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Job, Company, WatchProfile } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { 
  Briefcase, 
  Building2, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Search, 
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const PAGE_SIZE = 20;

export const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Record<string, Company>>({});
  const [watchProfiles, setWatchProfiles] = useState<WatchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedJobType, setSelectedJobType] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'recently_discovered'>('newest');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch jobs, companies, and watch profiles in parallel
        const [fetchedJobs, fetchedCompanies, fetchedProfiles] = await Promise.all([
          api.get<Job[]>('/api/v1/jobs'),
          api.get<Company[]>('/api/v1/companies'),
          api.get<WatchProfile[]>('/api/v1/watch-profiles').catch(() => [] as WatchProfile[])
        ]);
        
        setJobs(fetchedJobs);
        setWatchProfiles(fetchedProfiles);
        
        const companyMap: Record<string, Company> = {};
        fetchedCompanies.forEach(c => {
          companyMap[c.id] = c;
        });
        setCompanies(companyMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCompanyId, selectedLocation, selectedJobType, sortBy]);

  // Derive filter options from available jobs dataset
  const availableLocations = useMemo(() => {
    const locs = new Set<string>();
    jobs.forEach(j => {
      if (j.location) locs.add(j.location.trim());
    });
    return Array.from(locs).sort();
  }, [jobs]);

  const availableJobTypes = useMemo(() => {
    const types = new Set<string>();
    jobs.forEach(j => {
      if (j.job_type) types.add(j.job_type.trim());
    });
    return Array.from(types).sort();
  }, [jobs]);
  
  const hasNullJobType = useMemo(() => jobs.some(j => !j.job_type), [jobs]);

  const availableCompanies = useMemo(() => {
    const companyIds = new Set<string>();
    
    // Derive from user's active watch profiles configuration
    watchProfiles
      .filter(p => p.is_active !== false)
      .forEach(p => {
        (p.companies || []).forEach(c => {
          if (c.is_active !== false) {
            companyIds.add(c.company_id);
          }
        });
      });

    // Fallback to returned jobs dataset if no watch profiles or monitored companies configured
    if (companyIds.size === 0) {
      jobs.forEach(j => companyIds.add(j.company_id));
    }

    return Array.from(companyIds)
      .map(id => companies[id])
      .filter((c): c is Company => Boolean(c))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [watchProfiles, jobs, companies]);

  // Apply filters and sorting
  const filteredAndSortedJobs = useMemo(() => {
    let result = jobs;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(j => {
        const cName = companies[j.company_id]?.name || '';
        return (
          j.title.toLowerCase().includes(q) ||
          cName.toLowerCase().includes(q) ||
          (j.location && j.location.toLowerCase().includes(q))
        );
      });
    }

    // Company
    if (selectedCompanyId) {
      result = result.filter(j => j.company_id === selectedCompanyId);
    }

    // Location
    if (selectedLocation) {
      result = result.filter(j => j.location?.trim() === selectedLocation);
    }

    // Job Type
    if (selectedJobType) {
      if (selectedJobType === 'null') {
        result = result.filter(j => !j.job_type);
      } else {
        result = result.filter(j => j.job_type?.trim() === selectedJobType);
      }
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'newest') {
        const dateA = a.posted_at ? new Date(a.posted_at).getTime() : 0;
        const dateB = b.posted_at ? new Date(b.posted_at).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA; // Descending
      }
      
      // Fallback or explicit recently_discovered
      const firstA = new Date(a.first_seen_at).getTime();
      const firstB = new Date(b.first_seen_at).getTime();
      return firstB - firstA; // Descending
    });

    return result;
  }, [jobs, companies, searchQuery, selectedCompanyId, selectedLocation, selectedJobType, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedJobs.length / PAGE_SIZE);
  const paginatedJobs = filteredAndSortedJobs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCompanyId('');
    setSelectedLocation('');
    setSelectedJobType('');
    setSortBy('newest');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="pb-2 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
              Telemetry Catalog
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl font-sans">Jobs</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">Loading your discovered jobs...</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="pb-2 border-b border-slate-800/60">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-sans">Jobs</h1>
        </div>
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (jobs.length === 0 && availableCompanies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="pb-2 border-b border-slate-800/60">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-sans">Jobs</h1>
          <p className="text-xs sm:text-sm text-slate-400">Browse all matched jobs from your profiles</p>
        </div>
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/40 p-6 text-center">
          <Briefcase className="h-10 w-10 text-slate-600 mb-2" />
          <h3 className="text-lg font-medium text-white">No jobs have been discovered yet.</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-md">
            Jobs will appear here once a scan finds postings matching your watch profiles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
              Discovered ATS Postings
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl font-sans">Jobs</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">Browse all matched jobs from your profiles</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="rounded-lg bg-slate-900/80 border border-slate-800 px-3 py-1.5 text-cyan-400">
            {jobs.length} Total Postings
          </span>
          <span className="rounded-lg bg-slate-900/80 border border-slate-800 px-3 py-1.5 text-emerald-400">
            {filteredAndSortedJobs.length} Matched
          </span>
        </div>
      </div>

      {/* Filters Section */}
      <Card className="border-slate-800/80 bg-slate-900/70 shadow-lg">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search jobs"
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-500"
              />
            </div>
            
            <div>
              <select
                className="w-full flex h-10 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                value={selectedCompanyId}
                onChange={e => setSelectedCompanyId(e.target.value)}
                aria-label="Filter by company"
              >
                <option value="" className="bg-slate-900 text-white">All Companies</option>
                {availableCompanies.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                className="w-full flex h-10 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                aria-label="Filter by location"
              >
                <option value="" className="bg-slate-900 text-white">All Locations</option>
                {availableLocations.map(loc => (
                  <option key={loc} value={loc} className="bg-slate-900 text-white">{loc}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                className="w-full flex h-10 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                value={selectedJobType}
                onChange={e => setSelectedJobType(e.target.value)}
                aria-label="Filter by job type"
              >
                <option value="" className="bg-slate-900 text-white">All Job Types</option>
                {availableJobTypes.map(t => (
                  <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>
                ))}
                {hasNullJobType && <option value="null" className="bg-slate-900 text-white">Not specified</option>}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center flex-wrap gap-2 pt-3 border-t border-slate-800/80 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Sort by:</span>
              <select
                className="h-8 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                aria-label="Sort jobs"
              >
                <option value="newest" className="bg-slate-900 text-white">Newest (Posted)</option>
                <option value="recently_discovered" className="bg-slate-900 text-white">Recently Discovered</option>
              </select>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-slate-400 hover:text-white"
            >
              <RotateCcw className="mr-1.5 h-3 w-3" />
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="text-xs font-mono text-slate-400 font-medium">
          Showing <span className="text-cyan-400">{paginatedJobs.length}</span> of <span className="text-white">{filteredAndSortedJobs.length}</span> jobs
        </div>

        {paginatedJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-56 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/40 p-8 text-center">
            {selectedCompanyId && jobs.filter(j => j.company_id === selectedCompanyId).length === 0 ? (
              <>
                <Building2 className="h-10 w-10 text-slate-600 mb-3" />
                <h3 className="text-base font-semibold text-white">
                  No jobs have been discovered for {companies[selectedCompanyId]?.name || 'this company'} yet.
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 max-w-md font-mono">
                  The company is being monitored, but no job postings are currently available in the database.
                </p>
              </>
            ) : jobs.length === 0 ? (
              <>
                <Briefcase className="h-10 w-10 text-slate-600 mb-3" />
                <h3 className="text-base font-semibold text-white">No jobs have been discovered yet.</h3>
                <p className="text-xs text-slate-400 mt-1.5 max-w-md font-mono">
                  Jobs will appear here once a scan finds postings matching your watch profiles.
                </p>
              </>
            ) : (
              <>
                <Search className="h-10 w-10 text-slate-600 mb-3" />
                <h3 className="text-base font-semibold text-white">No jobs match your current filters.</h3>
                <p className="text-xs text-slate-400 mt-1.5 mb-4 max-w-md font-mono">
                  Try adjusting search keywords, location filters, or job type filters.
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {paginatedJobs.map(job => {
              const companyName = companies[job.company_id]?.name || 'Unknown Company';
              const postedDate = job.posted_at ? new Date(job.posted_at).toLocaleDateString() : null;
              
              return (
                <Card
                  key={job.id}
                  className="border-slate-800/80 bg-slate-900/70 hover:border-slate-700/90 transition-all duration-200 group"
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start">
                    <div className="space-y-2 min-w-0">
                      <Link
                        to={`/dashboard/jobs/${job.id}`}
                        className="text-base sm:text-lg font-semibold text-white group-hover:text-cyan-300 line-clamp-2 transition-colors font-sans"
                      >
                        {job.title}
                      </Link>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-cyan-400" />
                          {companyName}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            &bull; <MapPin className="h-3 w-3 text-slate-500" /> {job.location}
                          </span>
                        )}
                        {postedDate && (
                          <span className="flex items-center gap-1">
                            &bull; <Calendar className="h-3 w-3 text-slate-500" /> Posted {postedDate}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-1 font-mono">
                        <Badge variant="outline" className="text-[11px] bg-slate-950/60 border-slate-800 text-slate-300">
                          {job.source}
                        </Badge>
                        {job.job_type && (
                          <Badge variant="success" className="text-[11px]">
                            {job.job_type}
                          </Badge>
                        )}
                        {job.is_active && (
                          <Badge variant="info" className="text-[11px]">
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="shrink-0 w-full sm:w-auto flex sm:flex-col gap-2 mt-2 sm:mt-0">
                      {job.apply_url ? (
                        <a 
                          href={job.apply_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto"
                        >
                          <Button
                            size="sm"
                            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-md shadow-cyan-500/20"
                          >
                            Apply
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        </a>
                      ) : (
                        <Link to={`/dashboard/jobs/${job.id}`} className="w-full sm:w-auto">
                          <Button variant="outline" size="sm" className="w-full border-slate-800 text-slate-300 hover:text-white">
                            View Details
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 pt-4 pb-8 font-mono text-xs">
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="border-slate-800 text-slate-300 hover:text-white"
            >
              <ChevronLeft className="mr-1 h-3 w-3" />
              Previous
            </Button>
            <span className="text-slate-400">
              Page <span className="text-cyan-400 font-bold">{currentPage}</span> of <span className="text-white font-bold">{totalPages}</span>
            </span>
            <Button 
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="border-slate-800 text-slate-300 hover:text-white"
            >
              Next
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsPage;
