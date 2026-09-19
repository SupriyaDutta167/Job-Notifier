import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ScanDetailPage } from '../pages/ScanDetailPage';
import { api } from '../lib/api';
import '@testing-library/jest-dom/vitest';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
}));

const mockScanDetail = {
  id: 'scan-detail-001',
  watch_profile_id: 'wp-1',
  watch_profile_name: 'SDE Internship',
  status: 'partial',
  started_at: '2026-09-19T07:08:44Z',
  completed_at: '2026-09-19T07:10:00Z',
  companies_checked: 4,
  jobs_discovered: 54,
  jobs_new: 1,
  jobs_matched: 0,
  notifications_sent: 0,
  error_count: 1,
  created_at: '2026-09-19T07:08:44Z',
  errors: [
    {
      id: 'err-1',
      scan_run_id: 'scan-detail-001',
      watch_profile_company_id: 'wpc-1',
      company_name: 'NVIDIA',
      error_type: 'HTTP_ERROR',
      message: 'HTTP error 303 fetching Workday API: Redirect to maintenance page',
      details: { duration_ms: 220, requests_made: 1 },
      created_at: '2026-09-19T07:09:30Z',
    },
  ],
  company_statuses: [
    {
      company_id: 'c1',
      company_name: 'JP Morgan',
      status: 'completed',
      error_type: null,
      error_message: null,
      career_url: 'https://jpmorgan.com/careers',
    },
    {
      company_id: 'c2',
      company_name: 'Amazon',
      status: 'completed',
      error_type: null,
      error_message: null,
      career_url: 'https://amazon.jobs',
    },
    {
      company_id: 'c3',
      company_name: 'Google',
      status: 'completed',
      error_type: null,
      error_message: null,
      career_url: 'https://careers.google.com',
    },
    {
      company_id: 'c4',
      company_name: 'NVIDIA',
      status: 'failed',
      error_type: 'HTTP_ERROR',
      error_message: 'HTTP error 303 fetching Workday API: Redirect to maintenance page',
      career_url: 'https://nvidia.wd5.myworkdayjobs.com',
    },
  ],
};

function renderWithRoute(scanId: string) {
  return render(
    <MemoryRouter initialEntries={[`/dashboard/scans/${scanId}`]}>
      <Routes>
        <Route path="/dashboard/scans/:id" element={<ScanDetailPage />} />
        <Route path="/dashboard/scans" element={<div>Scan History Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ScanDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 14. Detail loads
  it('renders scan detail with all sections', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockScanDetail);
    renderWithRoute('scan-detail-001');

    await waitFor(() => {
      expect(screen.getByText('SDE Internship')).toBeInTheDocument();
    });
    expect(screen.getByText('54')).toBeInTheDocument(); // jobs_discovered
    expect(screen.getByText('⚠ Partial')).toBeInTheDocument();
  });

  // 15. Errors render
  it('renders error details with company name and type', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockScanDetail);
    renderWithRoute('scan-detail-001');

    await waitFor(() => {
      expect(screen.getByText('HTTP_ERROR')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/HTTP error 303 fetching Workday API/).length).toBeGreaterThanOrEqual(1);
  });

  // 16. 404 works
  it('shows not found message on 404', async () => {
    const err = new Error('Not found');
    (err as any).status = 404;
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);
    renderWithRoute('nonexistent-id');

    await waitFor(() => {
      expect(screen.getByText(/Scan Run Not Found/i)).toBeInTheDocument();
    });
  });

  // 17. Back navigation works
  it('renders back navigation link', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockScanDetail);
    renderWithRoute('scan-detail-001');

    await waitFor(() => {
      expect(screen.getByText('SDE Internship')).toBeInTheDocument();
    });
    expect(screen.getByText(/Back to Scan History/i)).toBeInTheDocument();
  });

  // Company statuses render
  it('renders company status breakdown', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockScanDetail);
    renderWithRoute('scan-detail-001');

    await waitFor(() => {
      expect(screen.getByText('JP Morgan')).toBeInTheDocument();
    });
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
    // NVIDIA appears in company statuses and errors
    const nvidiaElements = screen.getAllByText('NVIDIA');
    expect(nvidiaElements.length).toBeGreaterThanOrEqual(1);
  });
});
