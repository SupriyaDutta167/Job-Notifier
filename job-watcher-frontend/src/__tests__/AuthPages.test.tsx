import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { supabase } from '../lib/supabase';
import '@testing-library/jest-dom/vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockUser: { email: string } | null = null;
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: vi.fn(),
  }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

const mockAuth = (supabase as any).auth;

describe('AuthPages (Stage 28A)', () => {
  beforeEach(() => {
    mockUser = null;
    mockNavigate.mockReset();
    vi.clearAllMocks();
  });

  // ==========================================
  // Login Page Tests
  // ==========================================
  describe('LoginPage', () => {
    it('1. renders login form with email and password inputs', () => {
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      expect(screen.getByRole('heading', { level: 2, name: /log in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^log in$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/signup');
    });

    it('2. validates empty fields on submit', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      await user.click(screen.getByRole('button', { name: /^log in$/i }));

      expect(screen.getByTestId('auth-error-alert')).toHaveTextContent(/please fill in all fields/i);
      expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('3. shows loading state during submission', async () => {
      const user = userEvent.setup();
      let resolveAuth: any;
      mockAuth.signInWithPassword.mockImplementation(
        () => new Promise((resolve) => { resolveAuth = resolve; })
      );

      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      await user.type(screen.getByLabelText(/email address/i, { selector: 'input' }), 'dev@example.com');
      await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'secret123');
      await user.click(screen.getByRole('button', { name: /^log in$/i }));

      expect(screen.getByText(/signing in\.\.\./i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();

      resolveAuth({ data: { session: {} }, error: null });
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
    });

    it('4. navigates to /dashboard on successful login', async () => {
      const user = userEvent.setup();
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { session: { access_token: 'fake-token' } },
        error: null,
      });

      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      await user.type(screen.getByLabelText(/email address/i, { selector: 'input' }), 'dev@example.com');
      await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'secret123');
      await user.click(screen.getByRole('button', { name: /^log in$/i }));

      await waitFor(() => {
        expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
          email: 'dev@example.com',
          password: 'secret123',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('5. renders normalized error alert on invalid credentials', async () => {
      const user = userEvent.setup();
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      await user.type(screen.getByLabelText(/email address/i), 'dev@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /^log in$/i }));

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-alert')).toHaveTextContent(
          /invalid email or password/i
        );
      });
    });

    it('6. toggles password visibility button', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleButton = screen.getByRole('button', { name: /show password/i });
      await user.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');

      const hideButton = screen.getByRole('button', { name: /hide password/i });
      await user.click(hideButton);

      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  // ==========================================
  // Signup Page Tests
  // ==========================================
  describe('SignupPage', () => {
    it('7. renders signup form with confirm password', () => {
      render(
        <BrowserRouter>
          <SignupPage />
        </BrowserRouter>
      );

      expect(screen.getByRole('heading', { level: 2, name: /create account/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i, { selector: 'input' })).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i, { selector: 'input' })).toBeInTheDocument();
      expect(screen.getByLabelText(/^confirm password$/i, { selector: 'input' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
    });

    it('8. validates required fields', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <SignupPage />
        </BrowserRouter>
      );

      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByTestId('auth-error-alert')).toHaveTextContent(/please fill in all fields/i);
      expect(mockAuth.signUp).not.toHaveBeenCalled();
    });

    it('9. validates minimum password length', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <SignupPage />
        </BrowserRouter>
      );

      await user.type(screen.getByLabelText(/email address/i, { selector: 'input' }), 'new@example.com');
      await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), '12345');
      await user.type(screen.getByLabelText(/^confirm password$/i, { selector: 'input' }), '12345');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByTestId('auth-error-alert')).toHaveTextContent(
        /password must be at least 6 characters long/i
      );
      expect(mockAuth.signUp).not.toHaveBeenCalled();
    });

    it('10. validates password mismatch', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <SignupPage />
        </BrowserRouter>
      );

      await user.type(screen.getByLabelText(/email address/i, { selector: 'input' }), 'new@example.com');
      await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'secret123');
      await user.type(screen.getByLabelText(/^confirm password$/i, { selector: 'input' }), 'different123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByTestId('auth-error-alert')).toHaveTextContent(/passwords do not match/i);
      expect(mockAuth.signUp).not.toHaveBeenCalled();
    });

    it('11. handles successful signup with immediate session', async () => {
      const user = userEvent.setup();
      mockAuth.signUp.mockResolvedValueOnce({
        data: { session: { access_token: 'valid' } },
        error: null,
      });

      render(
        <BrowserRouter>
          <SignupPage />
        </BrowserRouter>
      );

      await user.type(screen.getByLabelText(/email address/i, { selector: 'input' }), 'new@example.com');
      await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'secret123');
      await user.type(screen.getByLabelText(/^confirm password$/i, { selector: 'input' }), 'secret123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockAuth.signUp).toHaveBeenCalledWith({
          email: 'new@example.com',
          password: 'secret123',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('12. handles successful signup requiring email confirmation', async () => {
      const user = userEvent.setup();
      mockAuth.signUp.mockResolvedValueOnce({
        data: { session: null, user: { id: 'usr-1' } },
        error: null,
      });

      render(
        <BrowserRouter>
          <SignupPage />
        </BrowserRouter>
      );

      await user.type(screen.getByLabelText(/email address/i, { selector: 'input' }), 'new@example.com');
      await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'secret123');
      await user.type(screen.getByLabelText(/^confirm password$/i, { selector: 'input' }), 'secret123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/confirmation link dispatched/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /return to log in/i })).toHaveAttribute(
          'href',
          '/login'
        );
      });
    });

    it('13. renders normalized error alert on duplicate email', async () => {
      const user = userEvent.setup();
      mockAuth.signUp.mockResolvedValueOnce({
        data: null,
        error: { message: 'User already registered' },
      });

      render(
        <BrowserRouter>
          <SignupPage />
        </BrowserRouter>
      );

      await user.type(screen.getByLabelText(/email address/i, { selector: 'input' }), 'existing@example.com');
      await user.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'secret123');
      await user.type(screen.getByLabelText(/^confirm password$/i, { selector: 'input' }), 'secret123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByTestId('auth-error-alert')).toHaveTextContent(
          /an account with this email already exists/i
        );
      });
    });
  });
});
