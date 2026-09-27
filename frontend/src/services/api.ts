import { API_BASE_URL } from '../utils/constants';
import type { ApiResponse } from '../types';

export class ApiError extends Error {
  public statusCode: number;
  public details?: unknown;
  public code?: string;

  constructor(message: string, statusCode: number, details?: unknown, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const getHeaders = (customHeaders?: HeadersInit): HeadersInit => {
  const token = localStorage.getItem('reservepulse_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return { ...headers, ...customHeaders };
};

const parseResponseBody = async (response: Response): Promise<any> => {
  const text = await response.text();
  if (!text || !text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const extractErrorMessage = (data: any, status: number): string => {
  if (data?.error?.message && typeof data.error.message === 'string') {
    return data.error.message;
  }
  if (data?.message && typeof data.message === 'string') {
    return data.message;
  }
  if (typeof data?.error === 'string') {
    return data.error;
  }
  if (status === 401) return 'Your session has expired or requires authentication.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested resource was not found.';
  if (status === 409) return 'A resource conflict occurred. Please refresh and try again.';
  if (status >= 500) return 'Internal server error occurred. Please try again shortly.';
  return `Request failed with status ${status}`;
};

export const apiClient = {
  async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(options?.headers),
        ...options,
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        throw new ApiError(
          extractErrorMessage(data, response.status),
          response.status,
          data.error?.details,
          data.error?.code
        );
      }

      return data as ApiResponse<T>;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        err instanceof Error ? err.message : 'Network connection failure',
        0
      );
    }
  },

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(options?.headers),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        ...options,
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        throw new ApiError(
          extractErrorMessage(data, response.status),
          response.status,
          data.error?.details,
          data.error?.code
        );
      }

      return data as ApiResponse<T>;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        err instanceof Error ? err.message : 'Network connection failure',
        0
      );
    }
  },

  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: getHeaders(options?.headers),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        ...options,
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        throw new ApiError(
          extractErrorMessage(data, response.status),
          response.status,
          data.error?.details,
          data.error?.code
        );
      }

      return data as ApiResponse<T>;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        err instanceof Error ? err.message : 'Network connection failure',
        0
      );
    }
  },

  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: getHeaders(options?.headers),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        ...options,
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        throw new ApiError(
          extractErrorMessage(data, response.status),
          response.status,
          data.error?.details,
          data.error?.code
        );
      }

      return data as ApiResponse<T>;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        err instanceof Error ? err.message : 'Network connection failure',
        0
      );
    }
  },

  async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(options?.headers),
        ...options,
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        throw new ApiError(
          extractErrorMessage(data, response.status),
          response.status,
          data.error?.details,
          data.error?.code
        );
      }

      return data as ApiResponse<T>;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        err instanceof Error ? err.message : 'Network connection failure',
        0
      );
    }
  },
};
