import { describe, it, expect } from 'vitest';
import { parseApiError } from '../lib/utils';

describe('parseApiError', () => {
  it('handles string detail', () => {
    const errorData = { detail: 'A simple string error' };
    expect(parseApiError(errorData, 'Fallback')).toBe('A simple string error');
  });

  it('handles FastAPI validation error array', () => {
    const errorData = {
      detail: [
        { loc: ['body', 'name'], msg: 'field required', type: 'value_error.missing' },
        { loc: ['body', 'career_url'], msg: 'invalid url', type: 'value_error.url' }
      ]
    };
    expect(parseApiError(errorData, 'Fallback')).toBe('name: field required, career_url: invalid url');
  });

  it('handles nested detail message object', () => {
    const errorData = {
      detail: { message: 'Nested error message' }
    };
    expect(parseApiError(errorData, 'Fallback')).toBe('Nested error message');
  });

  it('handles direct message property', () => {
    const errorData = { message: 'Direct error message' };
    expect(parseApiError(errorData, 'Fallback')).toBe('Direct error message');
  });

  it('falls back to status text when errorData is null', () => {
    expect(parseApiError(null, 'Network Error')).toBe('Network Error');
  });

  it('falls back to status text when errorData format is unknown', () => {
    const errorData = { something_else: 123 };
    expect(parseApiError(errorData, 'Bad Request')).toBe('Bad Request');
  });

  it('falls back to generic message when no status text and unknown error format', () => {
    const errorData = { something: 'weird' };
    expect(parseApiError(errorData, '')).toBe('An unexpected error occurred');
  });
});
