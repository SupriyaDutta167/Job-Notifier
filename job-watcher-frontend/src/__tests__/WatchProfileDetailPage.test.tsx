/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { WatchProfileDetailPage } from '../pages/WatchProfileDetailPage';
import { api, ApiError } from '../lib/api';

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    }
  };
});

describe('WatchProfileDetailPage', () => {
  const renderWithRouter = (ui: React.ReactElement, { route = '/dashboard/watch-profiles/1' } = {}) => {
    window.history.pushState({}, 'Test page', route);
    return render(
      <BrowserRouter>
        <Routes>
          <Route path="/dashboard/watch-profiles/:id" element={ui} />
        </Routes>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 404 state when profile not found', async () => {
    vi.mocked(api.get).mockImplementation(async () => {
      throw new ApiError(404, 'Not Found');
    });

    renderWithRouter(<WatchProfileDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Watch profile not found')).toBeInTheDocument();
    });
  });

  it('renders profile details and rules', async () => {
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url.includes('/companies')) return [];
      if (url.includes('/rules')) return { job_type: 'Internship', role_keywords: ['SDE'] };
      return { id: '1', name: 'India SDE Internships', is_active: true };
    });

    renderWithRouter(<WatchProfileDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('India SDE Internships')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Internship')).toBeInTheDocument();
      expect(screen.getByText('SDE')).toBeInTheDocument();
    });
  });
});
