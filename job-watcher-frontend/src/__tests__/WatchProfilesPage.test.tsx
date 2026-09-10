/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { WatchProfilesPage } from '../pages/WatchProfilesPage';
import { api } from '../lib/api';

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

describe('WatchProfilesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no profiles exist', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    render(
      <BrowserRouter>
        <WatchProfilesPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Watch Profiles')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('No watch profiles yet')).toBeInTheDocument();
    });
  });

  it('renders a list of watch profiles', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      { id: '1', name: 'Profile 1', is_active: true },
      { id: '2', name: 'Profile 2', is_active: false },
    ]);

    render(
      <BrowserRouter>
        <WatchProfilesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Profile 1')).toBeInTheDocument();
      expect(screen.getByText('Profile 2')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('deletes a profile', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      { id: '1', name: 'Profile 1', is_active: true }
    ]);
    vi.mocked(api.delete).mockResolvedValueOnce({});
    
    window.confirm = vi.fn().mockReturnValue(true);

    render(
      <BrowserRouter>
        <WatchProfilesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Profile 1')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByText('Delete');
    await userEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(api.delete).toHaveBeenCalledWith('/api/v1/watch-profiles/1');
    
    await waitFor(() => {
      expect(screen.queryByText('Profile 1')).not.toBeInTheDocument();
    });
  });
});
