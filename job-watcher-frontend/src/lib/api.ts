import { supabase } from './supabase';
import { parseApiError } from './utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let session = null;
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  }
  
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    // Attempt token refresh via supabase if possible or logout
    // Usually Supabase handles the session, but if 401 is from backend, 
    // it could mean the token is expired. Supabase getSession above should have refreshed it.
    // If we still get 401, we should probably sign out.
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = '/login';
    throw new ApiError(401, 'Unauthorized');
  }

  if (response.status === 403) {
    throw new ApiError(403, 'You do not have permission to access this resource.');
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      // Not JSON
    }
    const errorMessage = parseApiError(errorData, response.statusText);
    throw new ApiError(response.status, errorMessage, errorData);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return null as any;
  }

  return JSON.parse(text);
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: any, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: any, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'DELETE' }),
};
