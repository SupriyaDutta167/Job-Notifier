import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { JobsPage } from '../pages/JobsPage';
import { api } from '../lib/api';
import '@testing-library/jest-dom/vitest';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
}));

const mockJobs = [
  {
    id: 'job-1',
    company_id: 'comp-1',
    source: 'greenhouse',
    fingerprint: '123',
    title: 'Senior Software Engineer',
    location: 'Remote',
    job_type: 'Full-time',
    apply_url: 'https://apply.com/1',
    posted_at: '2026-09-08T12:00:00Z',
    first_seen_at: '2026-09-08T12:00:00Z',
    last_seen_at: '2026-09-08T12:00:00Z',
    is_active: true,
  },
  {
    id: 'job-2',
    company_id: 'comp-2',
    source: 'lever',
    fingerprint: '124',
    title: 'Product Manager',
    location: 'New York',
    job_type: 'Contract',
    apply_url: 'https://apply.com/2',
    posted_at: '2026-09-09T12:00:00Z',
    first_seen_at: '2026-09-09T12:00:00Z',
    last_seen_at: '2026-09-09T12:00:00Z',
    is_active: true,
  }
];

const mockCompanies = [
  { id: 'comp-1', name: 'Acme Corp' },
  { id: 'comp-2', name: 'Globex' }
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <JobsPage />
    </BrowserRouter>
  );
};

describe('JobsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByText('Loading your discovered jobs...')).toBeInTheDocument();
  });

  it('renders no jobs empty state', async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('No jobs have been discovered yet.')).toBeInTheDocument();
    });
  });

  it('renders jobs and handles basic API data', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/v1/jobs') return mockJobs;
      if (url === '/api/v1/companies') return mockCompanies;
      return [];
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Product Manager')).toBeInTheDocument();
    });
    
    expect(screen.getAllByText('Acme Corp')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Globex')[0]).toBeInTheDocument();
    
    // Sort is Newest by default, so Product Manager (Sep 9) is first? 
    // In our test, we just check they both render.
    
    // Apply link uses actual job URL
    const links = screen.getAllByText('Apply');
    expect(links.length).toBe(2);
    expect(links[0].closest('a')).toHaveAttribute('href');
  });

  it('search filters jobs', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/v1/jobs') return mockJobs;
      if (url === '/api/v1/companies') return mockCompanies;
      return [];
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search jobs...');
    fireEvent.change(searchInput, { target: { value: 'Product' } });

    expect(screen.queryByText('Senior Software Engineer')).not.toBeInTheDocument();
    expect(screen.getByText('Product Manager')).toBeInTheDocument();
  });

  it('company filter works', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/v1/jobs') return mockJobs;
      if (url === '/api/v1/companies') return mockCompanies;
      return [];
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    const companySelect = screen.getByLabelText('Filter by company');
    fireEvent.change(companySelect, { target: { value: 'comp-1' } });

    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Product Manager')).not.toBeInTheDocument();
  });

  it('location filter works', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/v1/jobs') return mockJobs;
      if (url === '/api/v1/companies') return mockCompanies;
      return [];
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    const locationSelect = screen.getByLabelText('Filter by location');
    fireEvent.change(locationSelect, { target: { value: 'New York' } });

    expect(screen.queryByText('Senior Software Engineer')).not.toBeInTheDocument();
    expect(screen.getByText('Product Manager')).toBeInTheDocument();
  });

  it('job type filter works', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/v1/jobs') return mockJobs;
      if (url === '/api/v1/companies') return mockCompanies;
      return [];
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    const typeSelect = screen.getByLabelText('Filter by job type');
    fireEvent.change(typeSelect, { target: { value: 'Contract' } });

    expect(screen.queryByText('Senior Software Engineer')).not.toBeInTheDocument();
    expect(screen.getByText('Product Manager')).toBeInTheDocument();
  });

  it('clear filters works', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/v1/jobs') return mockJobs;
      if (url === '/api/v1/companies') return mockCompanies;
      return [];
    });

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search jobs...');
    fireEvent.change(searchInput, { target: { value: 'xyz' } });
    
    expect(screen.getByText('No jobs match your current filters.')).toBeInTheDocument();
    
    // Clear filters
    const clearBtn = screen.getAllByText('Clear filters')[0];
    fireEvent.click(clearBtn);
    
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
  });

  it('displays API error', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  // Test 6: Frontend receives NVIDIA + Amazon jobs. Company dropdown contains both.
  it('Test 6: company dropdown contains both NVIDIA and Amazon when both jobs are returned', async () => {
    const jobsWithNvidiaAndAmazon = [
      {
        id: 'job-nvidia-1',
        company_id: 'comp-nvidia',
        source: 'workday',
        fingerprint: 'nv-1',
        title: 'Deep Learning Engineer',
        location: 'Santa Clara, CA',
        job_type: 'Full-time',
        apply_url: 'https://nvidia.com/job/1',
        posted_at: '2026-09-10T12:00:00Z',
        first_seen_at: '2026-09-10T12:00:00Z',
        last_seen_at: '2026-09-10T12:00:00Z',
        is_active: true,
      },
      {
        id: 'job-amazon-1',
        company_id: 'comp-amazon',
        source: 'generic_html',
        fingerprint: 'amz-1',
        title: 'Software Development Engineer',
        location: 'Seattle, WA',
        job_type: 'Internship',
        apply_url: 'https://amazon.jobs/1',
        posted_at: '2026-09-10T13:00:00Z',
        first_seen_at: '2026-09-10T13:00:00Z',
        last_seen_at: '2026-09-10T13:00:00Z',
        is_active: true,
      }
    ];

    const companiesCatalog = [
      { id: 'comp-nvidia', name: 'NVIDIA' },
      { id: 'comp-amazon', name: 'Amazon' }
    ];

    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/v1/jobs') return jobsWithNvidiaAndAmazon;
      if (url === '/api/v1/companies') return companiesCatalog;
      return [];
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Deep Learning Engineer')).toBeInTheDocument();
      expect(screen.getByText('Software Development Engineer')).toBeInTheDocument();
    });

    const companySelect = screen.getByLabelText('Filter by company') as HTMLSelectElement;
    const options = Array.from(companySelect.options).map(o => o.text);
    expect(options).toContain('All Companies');
    expect(options).toContain('Amazon');
    expect(options).toContain('NVIDIA');
  });

  // Test 7: Location and job type options are populated from returned jobs
  it('Test 7: location and job type options are dynamically populated from returned jobs', async () => {
    const jobsData = [
      {
        id: 'job-1',
        company_id: 'comp-1',
        source: 'workday',
        fingerprint: 'fp-1',
        title: 'Engineer 1',
        location: 'Bengaluru, India',
        job_type: 'Full-time',
        apply_url: 'https://apply.com/1',
        posted_at: '2026-09-10T12:00:00Z',
        first_seen_at: '2026-09-10T12:00:00Z',
        last_seen_at: '2026-09-10T12:00:00Z',
        is_active: true,
      },
      {
        id: 'job-2',
        company_id: 'comp-1',
        source: 'workday',
        fingerprint: 'fp-2',
        title: 'Engineer 2',
        location: 'Santa Clara, CA',
        job_type: 'Contract',
        apply_url: 'https://apply.com/2',
        posted_at: '2026-09-10T12:00:00Z',
        first_seen_at: '2026-09-10T12:00:00Z',
        last_seen_at: '2026-09-10T12:00:00Z',
        is_active: true,
      }
    ];

    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/v1/jobs') return jobsData;
      if (url === '/api/v1/companies') return [{ id: 'comp-1', name: 'TechCorp' }];
      return [];
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Engineer 1')).toBeInTheDocument();
    });

    const locationSelect = screen.getByLabelText('Filter by location') as HTMLSelectElement;
    const locationOptions = Array.from(locationSelect.options).map(o => o.text);
    expect(locationOptions).toContain('All Locations');
    expect(locationOptions).toContain('Bengaluru, India');
    expect(locationOptions).toContain('Santa Clara, CA');

    const jobTypeSelect = screen.getByLabelText('Filter by job type') as HTMLSelectElement;
    const jobTypeOptions = Array.from(jobTypeSelect.options).map(o => o.text);
    expect(jobTypeOptions).toContain('All Job Types');
    expect(jobTypeOptions).toContain('Full-time');
    expect(jobTypeOptions).toContain('Contract');
  });

  // Test 8: Monitored companies derived from watch profiles (JP Morgan, Amazon, Google, NVIDIA)
  it('Test 8: company dropdown is derived from active watch profile monitored companies', async () => {
    const mockWatchProfiles = [
      {
        id: 'prof-1',
        name: 'SDE Internship',
        is_active: true,
        companies: [
          { company_id: 'comp-jpmc', is_active: true },
          { company_id: 'comp-amazon', is_active: true },
          { company_id: 'comp-google', is_active: true },
          { company_id: 'comp-nvidia', is_active: true },
        ]
      }
    ];

    const mockCatalog = [
      { id: 'comp-jpmc', name: 'JP Morgan' },
      { id: 'comp-amazon', name: 'Amazon' },
      { id: 'comp-google', name: 'Google' },
      { id: 'comp-nvidia', name: 'NVIDIA' },
    ];

    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/v1/jobs') return [];
      if (url === '/api/v1/companies') return mockCatalog;
      if (url === '/api/v1/watch-profiles') return mockWatchProfiles;
      return [];
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText('Filter by company')).toBeInTheDocument();
    });

    const companySelect = screen.getByLabelText('Filter by company') as HTMLSelectElement;
    const options = Array.from(companySelect.options).map(o => o.text);
    expect(options).toContain('All Companies');
    expect(options).toContain('Amazon');
    expect(options).toContain('Google');
    expect(options).toContain('JP Morgan');
    expect(options).toContain('NVIDIA');
  });

  // Test 9 & 10: Monitored company with 0 jobs appears in dropdown and shows empty state when selected
  it('Test 9 & 10: company with 0 jobs shows correct empty state when selected', async () => {
    const mockWatchProfiles = [
      {
        id: 'prof-1',
        name: 'SDE Internship',
        is_active: true,
        companies: [
          { company_id: 'comp-jpmc', is_active: true },
          { company_id: 'comp-nvidia', is_active: true },
        ]
      }
    ];

    const mockCatalog = [
      { id: 'comp-jpmc', name: 'JP Morgan' },
      { id: 'comp-nvidia', name: 'NVIDIA' },
    ];

    // NVIDIA has 1 job, JP Morgan has 0 jobs
    const jobsData = [
      {
        id: 'job-nv-1',
        company_id: 'comp-nvidia',
        source: 'workday',
        fingerprint: 'nv-1',
        title: 'Deep Learning Engineer',
        location: 'Santa Clara, CA',
        job_type: 'Full-time',
        apply_url: 'https://nvidia.com/1',
        posted_at: '2026-09-10T12:00:00Z',
        first_seen_at: '2026-09-10T12:00:00Z',
        last_seen_at: '2026-09-10T12:00:00Z',
        is_active: true,
      }
    ];

    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/v1/jobs') return jobsData;
      if (url === '/api/v1/companies') return mockCatalog;
      if (url === '/api/v1/watch-profiles') return mockWatchProfiles;
      return [];
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Deep Learning Engineer')).toBeInTheDocument();
    });

    const companySelect = screen.getByLabelText('Filter by company') as HTMLSelectElement;
    // Verify JP Morgan is in the dropdown even with 0 jobs
    const options = Array.from(companySelect.options).map(o => o.text);
    expect(options).toContain('JP Morgan');

    // Select JP Morgan
    fireEvent.change(companySelect, { target: { value: 'comp-jpmc' } });

    // Should display the zero-job empty state for JP Morgan
    expect(screen.getByText('No jobs have been discovered for JP Morgan yet.')).toBeInTheDocument();
    expect(screen.getByText('The company is being monitored, but no job postings are currently available in the database.')).toBeInTheDocument();
    expect(screen.queryByText('Deep Learning Engineer')).not.toBeInTheDocument();
  });

  // Test 11: Selecting monitored company with jobs displays those jobs
  it('Test 11: selecting monitored company with jobs displays those jobs', async () => {
    const mockWatchProfiles = [
      {
        id: 'prof-1',
        name: 'Tech Roles',
        is_active: true,
        companies: [
          { company_id: 'comp-nvidia', is_active: true },
          { company_id: 'comp-amazon', is_active: true },
        ]
      }
    ];

    const mockCatalog = [
      { id: 'comp-nvidia', name: 'NVIDIA' },
      { id: 'comp-amazon', name: 'Amazon' },
    ];

    const jobsData = [
      {
        id: 'job-1',
        company_id: 'comp-nvidia',
        source: 'workday',
        fingerprint: '1',
        title: 'NVIDIA Engineer',
        location: 'Santa Clara, CA',
        is_active: true,
        first_seen_at: '2026-09-10T12:00:00Z',
        last_seen_at: '2026-09-10T12:00:00Z',
      },
      {
        id: 'job-2',
        company_id: 'comp-amazon',
        source: 'generic_html',
        fingerprint: '2',
        title: 'Amazon SDE',
        location: 'Seattle, WA',
        is_active: true,
        first_seen_at: '2026-09-10T12:00:00Z',
        last_seen_at: '2026-09-10T12:00:00Z',
      }
    ];

    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/v1/jobs') return jobsData;
      if (url === '/api/v1/companies') return mockCatalog;
      if (url === '/api/v1/watch-profiles') return mockWatchProfiles;
      return [];
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('NVIDIA Engineer')).toBeInTheDocument();
      expect(screen.getByText('Amazon SDE')).toBeInTheDocument();
    });

    const companySelect = screen.getByLabelText('Filter by company') as HTMLSelectElement;
    fireEvent.change(companySelect, { target: { value: 'comp-nvidia' } });

    expect(screen.getByText('NVIDIA Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Amazon SDE')).not.toBeInTheDocument();
  });

  // Test 12: Search operates strictly over returned jobs and does not match companies with 0 jobs
  it('Test 12: search operates strictly over returned jobs', async () => {
    const mockWatchProfiles = [
      {
        id: 'prof-1',
        name: 'Profiles',
        is_active: true,
        companies: [
          { company_id: 'comp-jpmc', is_active: true },
          { company_id: 'comp-nvidia', is_active: true },
        ]
      }
    ];

    const mockCatalog = [
      { id: 'comp-jpmc', name: 'JP Morgan' },
      { id: 'comp-nvidia', name: 'NVIDIA' },
    ];

    const jobsData = [
      {
        id: 'job-1',
        company_id: 'comp-nvidia',
        source: 'workday',
        fingerprint: '1',
        title: 'Software Engineer',
        location: 'Remote',
        is_active: true,
        first_seen_at: '2026-09-10T12:00:00Z',
        last_seen_at: '2026-09-10T12:00:00Z',
      }
    ];

    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === '/api/v1/jobs') return jobsData;
      if (url === '/api/v1/companies') return mockCatalog;
      if (url === '/api/v1/watch-profiles') return mockWatchProfiles;
      return [];
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    // Search for JP Morgan (which has 0 jobs)
    const searchInput = screen.getByPlaceholderText('Search jobs...');
    fireEvent.change(searchInput, { target: { value: 'JP Morgan' } });

    // Should show no jobs match filters
    expect(screen.queryByText('Software Engineer')).not.toBeInTheDocument();
    expect(screen.getByText('No jobs match your current filters.')).toBeInTheDocument();
  });
});
