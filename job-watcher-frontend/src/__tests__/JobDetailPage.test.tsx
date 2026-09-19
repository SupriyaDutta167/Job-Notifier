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

  it('handles 404 properly', async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(404, 'Job not found'));
    
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Job not found')).toBeInTheDocument();
    });
  });

  it('handles standard API error', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
    
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
