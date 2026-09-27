/**
 * Standardized API Response Utilities
 * Enforces unified JSON envelopes across all endpoints
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const successResponse = <T>(
  data: T,
  message?: string,
  meta?: Record<string, unknown>
): ApiResponse<T> => {
  return {
    success: true,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };
};

export const paginatedResponse = <T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): ApiResponse<T[]> => {
  const totalPages = Math.ceil(total / limit) || 1;

  const paginationMeta: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  return {
    success: true,
    message,
    data: items,
    meta: {
      pagination: paginationMeta,
    },
    timestamp: new Date().toISOString(),
  };
};

export const errorResponse = (
  message: string,
  code = 'INTERNAL_ERROR',
  details?: unknown
): ApiResponse => {
  return {
    success: false,
    message,
    error: {
      code,
      details,
    },
    timestamp: new Date().toISOString(),
  };
};
