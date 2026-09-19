import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ScansPage } from '../pages/ScansPage';
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

const mockScans = [
  {
    id: 'scan-001-aaaa-bbbb-cccc-dddddddddddd',
    watch_profile_id: 'wp-1',
    watch_profile_name: 'SDE Internship',
    status: 'completed',
    started_at: '2026-09-19T05:00:00Z',
    completed_at: '2026-09-19T05:02:30Z',
    companies_checked: 4,
    jobs_discovered: 114,
    jobs_new: 100,
    jobs_matched: 5,
    notifications_sent: 3,
    error_count: 0,
    created_at: '2026-09-19T05:00:00Z',
  },
  {
    id: 'scan-002-aaaa-bbbb-cccc-dddddddddddd',
    watch_profile_id: 'wp-1',
    watch_profile_name: 'Backend Engineer',
    status: 'partial',
    started_at: '2026-09-19T07:08:00Z',
    completed_at: '2026-09-19T07:10:00Z',
    companies_checked: 4,
    jobs_discovered: 54,
    jobs_new: 1,
    jobs_matched: 0,
    notifications_sent: 0,
    error_count: 1,
    created_at: '2026-09-19T07:08:00Z',
  },
  {
    id: 'scan-003-aaaa-bbbb-cccc-dddddddddddd',
    watch_profile_id: 'wp-1',
    watch_profile_name: 'SDE Internship',
    status: 'failed',
    started_at: '2026-09-18T12:00:00Z',
    completed_at: '2026-09-18T12:00:05Z',
    companies_checked: 0,
    jobs_discovered: 0,
    jobs_new: 0,
    jobs_matched: 0,
    notifications_sent: 0,
    error_count: 1,
    created_at: '2026-09-18T12:00:00Z',
  },
];

function renderPage() {
  return render(
    <BrowserRouter>
      <ScansPage />
    </BrowserRouter>
  );
}

describe('ScansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 8. Loading state
  it('shows loading spinner while fetching scans', () => {
    (api.get as ReturnType<typeof vi.fn>).mockReturnValueOnce(new Promise(() => {}));
    renderPage();
    expect(screen.getByLabelText('Loading scan runs')).toBeInTheDocument();
  });

  // 9. Scan list renders
  it('renders scan list with correct data', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockScans);
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('SDE Internship').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Backend Engineer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('scan-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('scan-002').length).toBeGreaterThan(0);
  });

  // 10. Empty state
  it('shows empty state when no scans returned', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No Scan Runs Found/i)).toBeInTheDocument();
    });
  });

  // 11. Error state
  it('shows error state on API failure', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Server error'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Failed to Load Scan History/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Server error/i)).toBeInTheDocument();
  });

  // 12. Status badges render
  it('renders correct status badges', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockScans);
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('✓ Completed').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('⚠ Partial').length).toBeGreaterThan(0);
    expect(screen.getAllByText('✕ Failed').length).toBeGreaterThan(0);
  });

  // 13. Filter by status
  it('filters scans by status when clicking filter buttons', async () => {
    (api.get as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockScans) // initial
      .mockResolvedValueOnce([mockScans[0]]); // after filter

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('scan-001').length).toBeGreaterThan(0);
    });

    const completedFilter = screen.getByRole('button', { name: 'Completed' });
    fireEvent.click(completedFilter);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/v1/scan-runs?limit=50&status=completed');
    });
  });
});
