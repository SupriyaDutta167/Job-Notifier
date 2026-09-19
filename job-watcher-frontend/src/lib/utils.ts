import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseApiError(errorData: any, statusText: string): string {
  if (!errorData) return statusText;
  
  if (typeof errorData.detail === 'string') {
    return errorData.detail;
  }
  
  if (Array.isArray(errorData.detail)) {
    // Handle FastAPI validation errors
    const messages = errorData.detail.map((err: any) => {
      const field = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : 'field';
      return `${field}: ${err.msg}`;
    });
    return messages.join(', ');
  }
  
  if (errorData.detail && typeof errorData.detail === 'object') {
    if (errorData.detail.message) {
      return String(errorData.detail.message);
    }
  }
  
  if (errorData.message && typeof errorData.message === 'string') {
    return errorData.message;
  }
  
  return statusText || 'An unexpected error occurred';
}

export function normalizeAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const message = typeof error === 'string' ? error : error.message || error.error_description || String(error);

  if (/invalid login credentials/i.test(message)) {
    return 'Invalid email or password. Please verify your credentials and try again.';
  }
  if (/user already registered/i.test(message)) {
    return 'An account with this email already exists. Please log in instead.';
  }
  if (/password.*(6|characters)/i.test(message)) {
    return 'Password must be at least 6 characters long.';
  }
  if (/rate limit/i.test(message)) {
    return 'Too many attempts. Please wait a few moments before trying again.';
  }
  if (/failed to fetch|network/i.test(message)) {
    return 'Network connection issue. Please check your connection and retry.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'Your email address has not been confirmed yet. Please check your inbox.';
  }
  return message;
}

