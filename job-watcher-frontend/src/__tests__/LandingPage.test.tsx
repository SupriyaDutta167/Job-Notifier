import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { PublicNavbar } from '../components/marketing/PublicNavbar';
import { HeroSceneFallback } from '../components/marketing/HeroScene';
import '@testing-library/jest-dom/vitest';

let mockUser: { email: string } | null = null;

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: vi.fn(),
  }),
}));

describe('LandingPage (Stage 28A)', () => {
  beforeEach(() => {
    mockUser = null;
    vi.clearAllMocks();
  });

  it('1. renders navbar with brand and links', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getAllByText('Job Watcher').length).toBeGreaterThan(0);
    expect(screen.getAllByText('How It Works').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pipeline').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Deterministic Matching').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Features').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Security').length).toBeGreaterThan(0);
  });

  it('2. renders hero with headline and value propositions', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /stop refreshing career pages/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/INTELLIGENT CAREER MONITORING/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero Scraper Duplicates/i)).toBeInTheDocument();
  });

  it('3. primary hero CTA links to /signup', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    const startWatchingLinks = screen.getAllByRole('link', { name: /start watching jobs/i });
    expect(startWatchingLinks.length).toBeGreaterThan(0);
    expect(startWatchingLinks[0]).toHaveAttribute('href', '/signup');
  });

  it('4. login CTA links to /login', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    const loginLinks = screen.getAllByRole('link', { name: /sign in|log in/i });
    const hasLoginHref = loginLinks.some((l) => l.getAttribute('href') === '/login');
    expect(hasLoginHref).toBe(true);
  });

  it('5. renders How It Works 4-step pipeline', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Target Career Portals')).toBeInTheDocument();
    expect(screen.getByText('Define Watch Profiles')).toBeInTheDocument();
    expect(screen.getByText('Automated Scan & Match')).toBeInTheDocument();
    expect(screen.getAllByText('Direct Telegram Alerts').length).toBeGreaterThan(0);
  });

  it('6. renders Product Pipeline architecture section', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText('DATA PIPELINE ARCHITECTURE')).toBeInTheDocument();
    expect(screen.getByText('1. Career Portals')).toBeInTheDocument();
    expect(screen.getByText('4. Deduplication')).toBeInTheDocument();
    expect(screen.getByText('6. Telegram Dispatch')).toBeInTheDocument();
  });

  it('7. renders Deterministic Matching demonstration', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText('TRANSPARENT MATCHING ENGINE')).toBeInTheDocument();
    expect(screen.getByText(/Your Rules. Your Signal./i)).toBeInTheDocument();
    expect(screen.getAllByText('SDE Internship').length).toBeGreaterThan(0);
    expect(screen.getByText(/MATCHED \(0.95\)/i)).toBeInTheDocument();
  });

  it('8. renders Feature Grid cards', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Targeted Career Page Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Multi-Profile & Company Scoping')).toBeInTheDocument();
    expect(screen.getByText('Idempotent Duplicate Protection')).toBeInTheDocument();
    expect(screen.getByText('Complete Scan Observability')).toBeInTheDocument();
  });

  it('9. renders Telegram Preview demonstration', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Job Watcher Bot')).toBeInTheDocument();
    expect(screen.getByText(/Instant Push Notifications on Telegram/i)).toBeInTheDocument();
    expect(screen.getByText(/New Job Match/i)).toBeInTheDocument();
    expect(screen.getByText('Apply on Career Site')).toBeInTheDocument();
  });

  it('10. renders Security & Scoping section', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText('SECURITY & PRIVACY ARCHITECTURE')).toBeInTheDocument();
    expect(screen.getByText('Authenticated & User-Scoped')).toBeInTheDocument();
    expect(screen.getByText('Server-Side Credential Safety')).toBeInTheDocument();
  });

  it('11. renders Final CTA section', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(
      screen.getByRole('link', { name: /create your watch profile/i })
    ).toHaveAttribute('href', '/signup');
  });

  it('12. renders Public Footer with links', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/All rights reserved/i)).toBeInTheDocument();
    expect(screen.getByText('Crawler Pipeline Operational')).toBeInTheDocument();
  });

  it('13. shows Dashboard link when authenticated', () => {
    mockUser = { email: 'engineer@example.com' };

    render(
      <MemoryRouter>
        <PublicNavbar />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByRole('link', { name: /go to dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  it('14. WebGL fallback renders cleanly without errors', () => {
    render(<HeroSceneFallback />);

    expect(screen.getByTestId('hero-scene-fallback')).toBeInTheDocument();
    expect(screen.getByText(/Job Intelligence Network • Static Mode/i)).toBeInTheDocument();
  });
});
