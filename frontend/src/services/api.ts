import { API_BASE_URL } from '../utils/constants';
import type { ApiResponse } from '../types';
import { handleClientMockRequest } from './mockRouter';

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

// When true, uses the fast, persistent client Cookie/LocalStorage DB engine
const USE_CLIENT_COOKIE_DB = true;

const getHeaders = (customHeaders?: HeadersInit): Record<string, string> => {
  const token = localStorage.getItem('reservepulse_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (customHeaders) {
    if (customHeaders instanceof Headers) {
      customHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(customHeaders)) {
      customHeaders.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else if (typeof customHeaders === 'object') {
      Object.assign(headers, customHeaders);
    }
  }
  return headers;
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
    if (USE_CLIENT_COOKIE_DB) {
      try {
        return await handleClientMockRequest<T>('GET', endpoint);
      } catch (err: unknown) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(err instanceof Error ? err.message : 'Operation failed', 400);
      }
    }

    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const { headers: customHeaders, ...restOptions } = options || {};
      const response = await fetch(url, {
        method: 'GET',
        ...restOptions,
        headers: getHeaders(customHeaders),
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
      // Fallback to client mock router if network error
      return await handleClientMockRequest<T>('GET', endpoint);
    }
  },

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    if (USE_CLIENT_COOKIE_DB) {
      try {
        return await handleClientMockRequest<T>('POST', endpoint, body);
      } catch (err: unknown) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(err instanceof Error ? err.message : 'Operation failed', 400);
      }
    }

    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const { headers: customHeaders, ...restOptions } = options || {};
      const response = await fetch(url, {
        method: 'POST',
        ...restOptions,
        headers: getHeaders(customHeaders),
        body: body !== undefined ? JSON.stringify(body) : undefined,
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
      return await handleClientMockRequest<T>('POST', endpoint, body);
    }
  },

  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    if (USE_CLIENT_COOKIE_DB) {
      try {
        return await handleClientMockRequest<T>('PUT', endpoint, body);
      } catch (err: unknown) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(err instanceof Error ? err.message : 'Operation failed', 400);
      }
    }

    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const { headers: customHeaders, ...restOptions } = options || {};
      const response = await fetch(url, {
        method: 'PUT',
        ...restOptions,
        headers: getHeaders(customHeaders),
        body: body !== undefined ? JSON.stringify(body) : undefined,
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
      return await handleClientMockRequest<T>('PUT', endpoint, body);
    }
  },

  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    if (USE_CLIENT_COOKIE_DB) {
      try {
        return await handleClientMockRequest<T>('PATCH', endpoint, body);
      } catch (err: unknown) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(err instanceof Error ? err.message : 'Operation failed', 400);
      }
    }

    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const { headers: customHeaders, ...restOptions } = options || {};
      const response = await fetch(url, {
        method: 'PATCH',
        ...restOptions,
        headers: getHeaders(customHeaders),
        body: body !== undefined ? JSON.stringify(body) : undefined,
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
      return await handleClientMockRequest<T>('PATCH', endpoint, body);
    }
  },

  async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    if (USE_CLIENT_COOKIE_DB) {
      try {
        return await handleClientMockRequest<T>('DELETE', endpoint);
      } catch (err: unknown) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(err instanceof Error ? err.message : 'Operation failed', 400);
      }
    }

    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const { headers: customHeaders, ...restOptions } = options || {};
      const response = await fetch(url, {
        method: 'DELETE',
        ...restOptions,
        headers: getHeaders(customHeaders),
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
      return await handleClientMockRequest<T>('DELETE', endpoint);
    }
  },
};
