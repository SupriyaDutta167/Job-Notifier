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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500">Loading your discovered jobs...</p>
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Jobs</h1>
        </div>
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (jobs.length === 0 && availableCompanies.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500">Browse all matched jobs from your profiles</p>
        </div>
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900">No jobs have been discovered yet.</h3>
          <p className="text-sm text-gray-500 mt-1">Jobs will appear here once a scan finds postings matching your watch profiles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Jobs</h1>
        <p className="text-sm text-gray-500">Browse all matched jobs from your profiles</p>
      </div>

      {/* Filters Section */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search jobs"
              />
            </div>
            
            <div>
              <select
                className="w-full flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600"
                value={selectedCompanyId}
                onChange={e => setSelectedCompanyId(e.target.value)}
                aria-label="Filter by company"
              >
                <option value="">All Companies</option>
                {availableCompanies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                className="w-full flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600"
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                aria-label="Filter by location"
              >
                <option value="">All Locations</option>
                {availableLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                className="w-full flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600"
                value={selectedJobType}
                onChange={e => setSelectedJobType(e.target.value)}
                aria-label="Filter by job type"
              >
                <option value="">All Job Types</option>
                {availableJobTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {hasNullJobType && <option value="null">Not specified</option>}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center flex-wrap gap-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <select
                className="h-8 rounded-md border border-gray-300 bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                aria-label="Sort jobs"
              >
                <option value="newest">Newest (Posted)</option>
                <option value="recently_discovered">Recently Discovered</option>
              </select>
            </div>
            
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="text-sm text-gray-600 font-medium">
          Showing {paginatedJobs.length} of {filteredAndSortedJobs.length} jobs
        </div>

        {paginatedJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
            {selectedCompanyId && jobs.filter(j => j.company_id === selectedCompanyId).length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900">
                  No jobs have been discovered for {companies[selectedCompanyId]?.name || 'this company'} yet.
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  The company is being monitored, but no job postings are currently available in the database.
                </p>
              </>
            ) : jobs.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900">No jobs have been discovered yet.</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Jobs will appear here once a scan finds postings matching your watch profiles.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900">No jobs match your current filters.</h3>
                <Button variant="ghost" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {paginatedJobs.map(job => {
              const companyName = companies[job.company_id]?.name || 'Unknown Company';
              const postedDate = job.posted_at ? new Date(job.posted_at).toLocaleDateString() : null;
              
              return (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start">
                    <div className="space-y-1">
                      <Link to={`/dashboard/jobs/${job.id}`} className="text-lg font-semibold text-indigo-600 hover:text-indigo-800 line-clamp-2">
                        {job.title}
                      </Link>
                      
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
                        <span className="font-medium text-gray-900">{companyName}</span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            &bull; {job.location}
                          </span>
                        )}
                        {postedDate && (
                          <span className="flex items-center gap-1">
                            &bull; Posted {postedDate}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Badge variant="outline" className="text-xs">{job.source}</Badge>
                        {job.job_type && <Badge variant="success" className="text-xs">{job.job_type}</Badge>}
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
                          <Button className="w-full">Apply</Button>
                        </a>
                      ) : (
                        <Link to={`/dashboard/jobs/${job.id}`} className="w-full sm:w-auto">
                          <Button variant="outline" className="w-full">View Details</Button>
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
          <div className="flex justify-center items-center gap-2 pt-4 pb-8">
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button 
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
