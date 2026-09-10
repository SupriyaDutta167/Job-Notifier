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
