import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SettingsPage } from '../pages/SettingsPage';
import { api } from '../lib/api';
import '@testing-library/jest-dom/vitest';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'user@example.com' },
  }),
}));

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

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <SettingsPage />
    </BrowserRouter>
  );
};

describe('SettingsPage (Stage 25 Scenarios 15-22)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // 15. Configured state
  it('15. renders Configured badge when user has telegram_chat_id', async () => {
    vi.mocked(api.get).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      telegram_chat_id: '987654321',
      is_active: true,
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Configured')).toBeInTheDocument();
      expect(screen.getByDisplayValue('987654321')).toBeInTheDocument();
    });
  });

  // 16. Not configured state
  it('16. renders Not Configured badge and setup guidance when user has no telegram_chat_id', async () => {
    vi.mocked(api.get).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      telegram_chat_id: null,
      is_active: true,
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Not Configured')).toBeInTheDocument();
      expect(screen.getByText(/Configure your Telegram Chat ID to receive Telegram job alerts/i)).toBeInTheDocument();
    });
  });

  // 17. Save chat ID
  it('17. saves telegram_chat_id via PATCH /api/v1/me and displays success message', async () => {
    vi.mocked(api.get).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      telegram_chat_id: null,
      is_active: true,
    });
    vi.mocked(api.patch).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      telegram_chat_id: '555123456',
      is_active: true,
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Not Configured')).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/Telegram Chat ID/i);
    fireEvent.change(input, { target: { value: '555123456' } });

    const saveBtn = screen.getByRole('button', { name: /Save Chat ID/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/v1/me', {
        telegram_chat_id: '555123456'
      });
      expect(screen.getByText('Chat ID saved successfully.')).toBeInTheDocument();
      expect(screen.getByText('Configured')).toBeInTheDocument();
    });
  });

  // 18. Validation error
  it('18. displays validation or API error when saving chat ID fails', async () => {
    vi.mocked(api.get).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      telegram_chat_id: null,
      is_active: true,
    });
    vi.mocked(api.patch).mockRejectedValue(new Error('Invalid chat ID format'));
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Not Configured')).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /Save Chat ID/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid chat ID format')).toBeInTheDocument();
    });
  });

  // 19. Test Telegram loading state
  it('19. shows loading state during Telegram test delivery', async () => {
    vi.mocked(api.get).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      telegram_chat_id: '987654321',
      is_active: true,
    });
    vi.mocked(api.post).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Test Telegram/i })).toBeInTheDocument();
    });

    const testBtn = screen.getByRole('button', { name: /Test Telegram/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText(/Sending test message\.\.\./i)).toBeInTheDocument();
    });
  });

  // 20. Test Telegram success state
  it('20. displays success feedback when Telegram test delivery succeeds', async () => {
    vi.mocked(api.get).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      telegram_chat_id: '987654321',
      is_active: true,
    });
    vi.mocked(api.post).mockResolvedValue({
      success: true,
      message: 'Test message sent successfully.'
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Test Telegram/i })).toBeInTheDocument();
    });

    const testBtn = screen.getByRole('button', { name: /Test Telegram/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText('Test message sent successfully.')).toBeInTheDocument();
    });
  });

  // 21. Test Telegram failure state
  it('21. displays human-readable error feedback when Telegram test delivery fails', async () => {
    vi.mocked(api.get).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      telegram_chat_id: '987654321',
      is_active: true,
    });
    vi.mocked(api.post).mockRejectedValue(new Error('Telegram delivery failed: chat not found'));
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Test Telegram/i })).toBeInTheDocument();
    });

    const testBtn = screen.getByRole('button', { name: /Test Telegram/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText('Telegram delivery failed: chat not found')).toBeInTheDocument();
      expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
    });
  });

  // 22. Bot token is not present in rendered UI
  it('22. ensures the secret Telegram bot token is never present in rendered DOM or attributes', async () => {
    vi.mocked(api.get).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      telegram_chat_id: '987654321',
      is_active: true,
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Telegram Notifications')).toBeInTheDocument();
    });

    const containerHtml = document.body.innerHTML;
    expect(containerHtml).not.toMatch(/bot[0-9]{8,}:/i);
    expect(containerHtml).not.toContain('TELEGRAM_BOT_TOKEN');
  });
});
