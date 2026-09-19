import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
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

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

const mockSummary = {
  active_watch_profiles: 2,
  monitored_companies: 4,
  available_jobs: 156,
  matched_jobs: 72,
  notifications: { total: 5, sent: 3, pending: 1, failed: 1 },
  latest_scan: {
    id: 'scan-abc-123',
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
  },
  schedule_info: 'Scheduled every 2 hours via GitHub Actions',
};

function renderPage() {
  return render(
    <BrowserRouter>
      <DashboardPage />
    </BrowserRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Summary cards render
  it('renders summary cards with correct metrics', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSummary);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // active profiles
    });
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1); // companies
    expect(screen.getByText('156')).toBeInTheDocument(); // available jobs
    expect(screen.getByText('72')).toBeInTheDocument(); // matched jobs
    expect(screen.getByText('5')).toBeInTheDocument(); // total notifications
  });

  // 2. Loading state
  it('shows loading spinner while fetching', () => {
    (api.get as ReturnType<typeof vi.fn>).mockReturnValueOnce(new Promise(() => {}));
    renderPage();

    expect(screen.getByLabelText('Loading dashboard')).toBeInTheDocument();
  });

  // 3. Empty/no-scan state
  it('renders no-scan state when latest_scan is null', async () => {
    const noScan = { ...mockSummary, latest_scan: null };
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(noScan);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No automated scans recorded yet/i)).toBeInTheDocument();
    });
  });

  // 4. Latest scan renders
  it('renders latest scan details when present', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSummary);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('SDE Internship')).toBeInTheDocument();
    });
    expect(screen.getByText('54')).toBeInTheDocument(); // jobs_discovered
    expect(screen.getByText('scan-abc')).toBeInTheDocument(); // short id
  });

  // 5. Errors render
  it('renders error state on API failure', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network failure'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Error Loading Dashboard/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Network failure/i)).toBeInTheDocument();
  });

  // 6. Navigation links work
  it('renders navigation links to other pages', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSummary);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    const jobLinks = screen.getAllByText(/Browse all jobs|View Matched Jobs/i);
    expect(jobLinks.length).toBeGreaterThan(0);
  });

  // 7. Metrics render correctly (notification breakdown)
  it('renders notification breakdown metrics', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSummary);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('3 sent')).toBeInTheDocument();
    });
    expect(screen.getByText('1 pend')).toBeInTheDocument();
    expect(screen.getByText('1 fail')).toBeInTheDocument();
  });
});
