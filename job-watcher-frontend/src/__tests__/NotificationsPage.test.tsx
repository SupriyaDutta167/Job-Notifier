import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotificationsPage } from '../pages/NotificationsPage';
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

const mockNotifications = [
  {
    id: 'notif-1',
    user_id: 'user-1',
    job_id: 'job-1',
    watch_profile_id: 'profile-1',
    channel: 'telegram',
    status: 'sent',
    recipient: '123456789',
    message: 'Alert: Senior Software Engineer at Acme Corp',
    sent_at: '2026-09-19T10:00:00Z',
    error_message: null,
    created_at: '2026-09-19T09:59:00Z',
    job_title: 'Senior Software Engineer',
    company_name: 'Acme Corp',
    watch_profile_name: 'Backend Profile',
    apply_url: 'https://acme.com/apply/1',
    source_url: 'https://acme.com/jobs/1',
    match_reason: 'Matched role keyword Senior and Software Engineer',
    match_score: 0.95
  },
  {
    id: 'notif-2',
    user_id: 'user-1',
    job_id: 'job-2',
    watch_profile_id: 'profile-1',
    channel: 'telegram',
    status: 'failed',
    recipient: '123456789',
    message: 'Alert: Cloud Architect at TechGlobal',
    sent_at: null,
    error_message: 'Telegram API timeout error',
    created_at: '2026-09-19T09:30:00Z',
    job_title: 'Cloud Architect',
    company_name: 'TechGlobal',
    watch_profile_name: 'Cloud Profile',
    apply_url: 'https://techglobal.com/apply/2',
    source_url: 'https://techglobal.com/jobs/2',
    match_reason: 'Matched cloud infrastructure rule',
    match_score: 0.88
  },
  {
    id: 'notif-3',
    user_id: 'user-1',
    job_id: 'job-3',
    watch_profile_id: 'profile-2',
    channel: 'telegram',
    status: 'pending',
    recipient: '123456789',
    message: 'Alert: QA Engineer at StartupInc',
    sent_at: null,
    error_message: null,
    created_at: '2026-09-19T09:00:00Z',
    job_title: 'QA Engineer',
    company_name: 'StartupInc',
    watch_profile_name: 'QA Profile',
    apply_url: 'https://startup.com/apply/3',
    source_url: 'https://startup.com/jobs/3',
    match_reason: 'Matched testing keywords',
    match_score: 0.82
  }
];

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  telegram_chat_id: '123456789',
  is_active: true
};

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <NotificationsPage />
    </BrowserRouter>
  );
};

describe('NotificationsPage (Stage 25 Scenarios 1-14)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // 1. Loading state
  it('1. renders loading state while fetching notifications', () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByTestId('notifications-loading')).toBeInTheDocument();
  });

  // 2. Empty state
  it('2. renders empty state when user has no notifications', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/api/v1/notifications') return [];
      if (url === '/api/v1/me') return mockUser;
      return [];
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
      expect(screen.getByText(/Notifications will appear after matching jobs are detected and delivered/i)).toBeInTheDocument();
    });
  });

  // 3. Notifications render
  it('3. renders notification cards with company, profile, and job titles', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/api/v1/notifications') return mockNotifications;
      if (url === '/api/v1/me') return mockUser;
      return [];
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Cloud Architect')).toBeInTheDocument();
      expect(screen.getByText('QA Engineer')).toBeInTheDocument();
      expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
      expect(screen.getAllByText('TechGlobal').length).toBeGreaterThan(0);
      expect(screen.getAllByText('StartupInc').length).toBeGreaterThan(0);
    });
  });

  // 4. Status badges render (Sent, Pending, Failed)
  it('4. renders status badges with accessible text and distinct states', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/api/v1/notifications') return mockNotifications;
      if (url === '/api/v1/me') return mockUser;
      return [];
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('✓ Sent')).toBeInTheDocument();
      expect(screen.getByText('✕ Failed')).toBeInTheDocument();
      expect(screen.getByText('⏳ Pending')).toBeInTheDocument();
    });
  });

  // 5. Search works
  it('5. filters notifications by search query across job, company, or profile', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/api/v1/notifications') return mockNotifications;
      if (url === '/api/v1/me') return mockUser;
      return [];
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by job, company, or profile/i);
    fireEvent.change(searchInput, { target: { value: 'TechGlobal' } });

    expect(screen.getByText('Cloud Architect')).toBeInTheDocument();
    expect(screen.queryByText('Senior Software Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('QA Engineer')).not.toBeInTheDocument();
  });

  // 6. Status filter works
  it('6. filters notifications by status (sent, pending, failed)', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/api/v1/notifications') return mockNotifications;
      if (url === '/api/v1/me') return mockUser;
      return [];
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/Filter by Status/i);
    fireEvent.change(statusSelect, { target: { value: 'failed' } });

    expect(screen.getByText('Cloud Architect')).toBeInTheDocument();
    expect(screen.queryByText('Senior Software Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('QA Engineer')).not.toBeInTheDocument();
  });

  // 7. Channel filter works
  it('7. filters notifications by channel', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/api/v1/notifications') return mockNotifications;
      if (url === '/api/v1/me') return mockUser;
      return [];
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    const channelSelect = screen.getByLabelText(/Filter by Channel/i);
    fireEvent.change(channelSelect, { target: { value: 'telegram' } });

    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
  });

  // 8. Company/profile filters work
  it('8. filters notifications by company and profile dropdowns', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/api/v1/notifications') return mockNotifications;
      if (url === '/api/v1/me') return mockUser;
      return [];
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/Filter by Company/i)).toBeInTheDocument();
    });

    const companySelect = screen.getByLabelText(/Filter by Company/i);
    fireEvent.change(companySelect, { target: { value: 'Acme Corp' } });

    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Cloud Architect')).not.toBeInTheDocument();
  });

  // 9. Clear filters works
  it('9. resets all filters when Clear Filters button is clicked', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/api/v1/notifications') return mockNotifications;
      if (url === '/api/v1/me') return mockUser;
      return [];
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by job, company, or profile/i);
    fireEvent.change(searchInput, { target: { value: 'NoMatchTextXYZ' } });

    expect(screen.getByText('No notifications match your current filters')).toBeInTheDocument();

    const clearButtons = screen.getAllByRole('button', { name: /Clear filters/i });
    fireEvent.click(clearButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Cloud Architect')).toBeInTheDocument();
    });
  });

  // 10. API error renders correctly
  it('10. renders error message if notifications API fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error loading notifications'));
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Network error loading notifications')).toBeInTheDocument();
    });
  });

  // 11. Notification detail renders correctly (modal)
  it('11. opens detail modal with full context, timestamps, and match reason', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/api/v1/notifications') return mockNotifications;
      if (url === '/api/v1/me') return mockUser;
      return [];
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByRole('button', { name: /Details/i });
    fireEvent.click(detailsButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Why this job matched')).toBeInTheDocument();
      expect(screen.getByText(/Matched role keyword Senior and Software Engineer/i)).toBeInTheDocument();
      expect(screen.getByText(/Confidence Score:/i)).toBeInTheDocument();
    });
  });

  // 12. Apply/job link works
  it('12. has working Apply external links with rel noopener noreferrer', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/api/v1/notifications') return mockNotifications;
      if (url === '/api/v1/me') return mockUser;
      return [];
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    const applyLinks = screen.getAllByRole('link', { name: /Apply/i });
    expect(applyLinks.length).toBeGreaterThan(0);
    expect(applyLinks[0]).toHaveAttribute('href', 'https://acme.com/apply/1');
    expect(applyLinks[0]).toHaveAttribute('target', '_blank');
    expect(applyLinks[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  // 13. Failure reason displays safely
  it('13. displays failure reason safely on failed notifications without leaking credentials', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/api/v1/notifications') return mockNotifications;
      if (url === '/api/v1/me') return mockUser;
      return [];
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Telegram API timeout error/i)).toBeInTheDocument();
      expect(screen.queryByText(/token/i)).not.toBeInTheDocument();
    });
  });

  // 14. Retry button behavior
  it('14. handles Retry button click on failed notification and updates state to sent', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/api/v1/notifications') return mockNotifications;
      if (url === '/api/v1/me') return mockUser;
      return [];
    });

    const updatedNotification = {
      ...mockNotifications[1],
      status: 'sent',
      sent_at: '2026-09-19T10:05:00Z',
      error_message: null
    };

    vi.mocked(api.post).mockResolvedValue(updatedNotification);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Cloud Architect')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/v1/notifications/notif-2/retry');
      expect(screen.getByText('Notification sent successfully!')).toBeInTheDocument();
    });
  });
});
