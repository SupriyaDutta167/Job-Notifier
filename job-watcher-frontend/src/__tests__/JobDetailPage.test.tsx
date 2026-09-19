import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { JobDetailPage } from '../pages/JobDetailPage';
import { api, ApiError } from '../lib/api';

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

const mockJob = {
  id: 'job-1',
  company_id: 'comp-1',
  source: 'greenhouse',
  fingerprint: '123',
  title: 'Senior Software Engineer',
  description: 'Great job description.\nSecond line.',
  location: 'Remote',
  job_type: 'Full-time',
  apply_url: 'https://apply.example.com',
  first_seen_at: '2026-09-10T12:00:00Z',
  last_seen_at: '2026-09-10T12:00:00Z',
  is_active: true,
  created_at: '2026-09-10T12:00:00Z',
  updated_at: '2026-09-10T12:00:00Z'
};

const mockCompany = {
  id: 'comp-1',
  name: 'Acme Corp',
  is_active: true,
  created_at: '2026-09-10T12:00:00Z',
  updated_at: '2026-09-10T12:00:00Z'
};

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard/jobs/:id" element={<JobDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
};

describe('JobDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.history.pushState({}, '', '/dashboard/jobs/job-1');
  });

  it('renders loading state initially', () => {
    // delay resolution to see loading state
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    
    renderComponent();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Spinner usually has role="status"
  });

  it('loads and displays job details successfully', async () => {
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url.includes('/api/v1/jobs/')) return mockJob;
      if (url.includes('/api/v1/companies/')) return mockCompany;
      throw new Error('Not found');
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('Full-time')).toBeInTheDocument();
    expect(screen.getByText(/Great job description/)).toBeInTheDocument();
    
    const applyBtn = screen.getByText('Apply External').closest('a');
    expect(applyBtn).toHaveAttribute('href', 'https://apply.example.com');
    expect(applyBtn).toHaveAttribute('target', '_blank');
    expect(applyBtn).toHaveAttribute('rel', 'noopener noreferrer');

    // No matches in mockJob -> displays no match information
    expect(screen.getByText('No match information is available for this job.')).toBeInTheDocument();
  });

  it('renders match section with profile name, score, and match reason', async () => {
    const jobWithMatch = {
      ...mockJob,
      matches: [
        {
          id: 'match-1',
          watch_profile_id: 'prof-1',
          profile_name: 'SDE Internship',
          matched: true,
          score: 0.87,
          match_reason: "Matched role keyword 'software engineer', location keyword 'Bengaluru'. No excluded terms found.",
          matched_at: '2026-09-10T12:00:00Z'
        }
      ]
    };

    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url.includes('/api/v1/jobs/')) return jobWithMatch;
      if (url.includes('/api/v1/companies/')) return mockCompany;
      throw new Error('Not found');
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Why this job matched')).toBeInTheDocument();
    });

    expect(screen.getByText('SDE Internship')).toBeInTheDocument();
    expect(screen.getByText('87% Match')).toBeInTheDocument();
    expect(screen.getByText(/Matched role keyword 'software engineer'/)).toBeInTheDocument();
    expect(screen.queryByText('No match information is available for this job.')).not.toBeInTheDocument();
  });

  it('renders multiple matching profiles correctly', async () => {
    const jobWithMultipleMatches = {
      ...mockJob,
      matches: [
        {
          id: 'match-1',
          watch_profile_id: 'prof-1',
          profile_name: 'SDE Internship',
          matched: true,
          score: 0.87,
          match_reason: "Matched role keyword 'software engineer', location keyword 'Bengaluru'.",
          matched_at: '2026-09-10T12:00:00Z'
        },
        {
          id: 'match-2',
          watch_profile_id: 'prof-2',
          profile_name: 'Backend Engineer',
          matched: true,
          score: 0.72,
          match_reason: "Matched role keyword 'software engineer'.",
          matched_at: '2026-09-10T12:00:00Z'
        }
      ]
    };

    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url.includes('/api/v1/jobs/')) return jobWithMultipleMatches;
      if (url.includes('/api/v1/companies/')) return mockCompany;
      throw new Error('Not found');
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Why this job matched')).toBeInTheDocument();
    });

    expect(screen.getByText('2 Matched Profiles')).toBeInTheDocument();
    expect(screen.getByText('SDE Internship')).toBeInTheDocument();
    expect(screen.getByText('87% Match')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('72% Match')).toBeInTheDocument();
  });

  it('renders no match state when matches list is empty', async () => {
    const jobWithEmptyMatches = {
      ...mockJob,
      matches: []
    };

    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url.includes('/api/v1/jobs/')) return jobWithEmptyMatches;
      if (url.includes('/api/v1/companies/')) return mockCompany;
      throw new Error('Not found');
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Why this job matched')).toBeInTheDocument();
    });

    expect(screen.getByText('No match information is available for this job.')).toBeInTheDocument();
  });

  it('displays job description safely', async () => {
    const jobWithScript = { ...mockJob, description: '<script>alert("xss")</script>' };
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url.includes('/api/v1/jobs/')) return jobWithScript;
      if (url.includes('/api/v1/companies/')) return mockCompany;
      throw new Error('Not found');
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    // The raw script tag text should be in the document (rendered as text, not executed)
    expect(screen.getByText(/<script>alert\("xss"\)<\/script>/)).toBeInTheDocument();
  });

  it('handles 404 properly with back link', async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(404, 'Job not found'));
    
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Job not found')).toBeInTheDocument();
    });

    expect(screen.getByText('← Back to Jobs')).toBeInTheDocument();
  });

  it('handles standard API error', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
