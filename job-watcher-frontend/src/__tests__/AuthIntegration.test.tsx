import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import '@testing-library/jest-dom/vitest';

let mockSession: any = null;
let mockLoading = false;
const mockLogout = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    session: mockSession,
    user: mockSession?.user ?? null,
    loading: mockLoading,
    logout: mockLogout,
  }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

const mockAuth = (supabase as any).auth;

describe('Frontend Auth Regression Suite (Stage 28A Fix)', () => {
  beforeEach(() => {
    mockSession = null;
    mockLoading = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. ProtectedRoute redirects unauthenticated visitors to /login', () => {
    mockSession = null;
    mockLoading = false;

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div data-testid="dashboard-content">Dashboard Area</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login-view">Login View</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('dashboard-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-view')).toBeInTheDocument();
  });

  it('2. ProtectedRoute renders children when authenticated session exists', () => {
    mockSession = {
      user: { id: 'usr-1', email: 'test@example.com' },
      access_token: 'valid-jwt-token',
    };
    mockLoading = false;

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div data-testid="dashboard-content">Dashboard Area</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login-view">Login View</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-view')).not.toBeInTheDocument();
  });

  it('3. API client attaches current Bearer token from Supabase session', async () => {
    const fakeToken = 'test-bearer-token-xyz';
    mockAuth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: fakeToken,
          user: { id: 'usr-1' },
        },
      },
    });

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: 'ok', total_jobs: 12 }),
    });
    globalThis.fetch = mockFetch as any;

    const result = await api.get('/api/v1/dashboard/summary');

    expect(result).toEqual({ status: 'ok', total_jobs: 12 });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    const url = callArgs[0];
    const options = callArgs[1];

    expect(url).toContain('/api/v1/dashboard/summary');
    expect(options.headers.get('Authorization')).toBe(`Bearer ${fakeToken}`);
  });

  it('4. Authenticated session does not trigger 401 sign out on 200 response', async () => {
    mockAuth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'valid-token',
          user: { id: 'usr-1' },
        },
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ email: 'test@example.com' }),
    }) as any;

    const result = await api.get('/api/v1/me');
    expect(result).toEqual({ email: 'test@example.com' });
    expect(mockAuth.signOut).not.toHaveBeenCalled();
  });

  it('5. 401 response from backend signs out and clears session', async () => {
    mockAuth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'stale-or-rejected-token',
        },
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => JSON.stringify({ detail: 'Could not validate credentials' }),
    }) as any;

    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { href: '' };

    await expect(api.get('/api/v1/dashboard/summary')).rejects.toThrow('Unauthorized');
    expect(mockAuth.signOut).toHaveBeenCalled();
    expect((window.location as any).href).toBe('/login');

    (window as any).location = originalLocation;
  });
});
