import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NotificationDetailPage } from '../pages/NotificationDetailPage';
import { api } from '../lib/api';
import '@testing-library/jest-dom/vitest';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
}));

const mockNotification = {
  id: 'notif-123',
  user_id: 'user-1',
  job_id: 'job-1',
  watch_profile_id: 'profile-1',
  channel: 'telegram',
  status: 'sent',
  recipient: '987654321',
  message: '🚨 New Job Match\nCompany: NVIDIA\nRole: Deep Learning Engineer',
  sent_at: '2026-09-19T10:15:00Z',
  error_message: null,
  created_at: '2026-09-19T10:14:00Z',
  job_title: 'Deep Learning Engineer',
  company_name: 'NVIDIA',
  watch_profile_name: 'AI Engineering',
  apply_url: 'https://nvidia.com/apply/dl',
  source_url: 'https://nvidia.com/jobs/dl',
  match_reason: 'Matched deep learning and neural network keywords',
  match_score: 0.98
};

const renderComponent = (id = 'notif-123') => {
  window.history.pushState({}, '', `/dashboard/notifications/${id}`);
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard/notifications/:id" element={<NotificationDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
};

describe('NotificationDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByTestId('notification-detail-loading')).toBeInTheDocument();
  });

  it('renders error state when notification is not found', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Notification not found'));
    renderComponent('unknown-id');

    await waitFor(() => {
      expect(screen.getByText('Notification not found')).toBeInTheDocument();
      expect(screen.getByText('← Back to Notifications')).toBeInTheDocument();
    });
  });

  it('renders full notification details, match reason, and apply link', async () => {
    vi.mocked(api.get).mockResolvedValue(mockNotification);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Deep Learning Engineer')).toBeInTheDocument();
      expect(screen.getByText('NVIDIA')).toBeInTheDocument();
      expect(screen.getByText('AI Engineering')).toBeInTheDocument();
      expect(screen.getByText('✓ Sent')).toBeInTheDocument();
      expect(screen.getByText('98%')).toBeInTheDocument();
      expect(screen.getByText(/Matched deep learning and neural network keywords/i)).toBeInTheDocument();
    });

    const applyLink = screen.getByRole('link', { name: /Apply \/ View Job/i });
    expect(applyLink).toHaveAttribute('href', 'https://nvidia.com/apply/dl');
    expect(applyLink).toHaveAttribute('target', '_blank');
    expect(applyLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows Retry button when notification failed and handles retry click', async () => {
    const failedNotification = {
      ...mockNotification,
      status: 'failed',
      error_message: 'Telegram server error'
    };
    vi.mocked(api.get).mockResolvedValue(failedNotification);
    vi.mocked(api.post).mockResolvedValue({
      ...failedNotification,
      status: 'sent',
      sent_at: '2026-09-19T10:20:00Z',
      error_message: null
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('✕ Failed')).toBeInTheDocument();
      expect(screen.getByText('Telegram server error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry Delivery/i })).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Retry Delivery/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/v1/notifications/notif-123/retry');
      expect(screen.getByText('Notification re-sent successfully!')).toBeInTheDocument();
      expect(screen.getByText('✓ Sent')).toBeInTheDocument();
    });
  });
});
