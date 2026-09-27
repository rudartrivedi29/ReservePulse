import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { errorResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export { AppError } from '../utils/errors';

/**
 * 404 Not Found Middleware Handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json(
    errorResponse(
      `Resource not found: ${req.method} ${req.originalUrl}`,
      'NOT_FOUND',
      {
        path: req.originalUrl,
        method: req.method,
      }
    )
  );
};

/**
 * Centralized Global Error Handler Middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected internal server error occurred';
  let details: unknown = undefined;

  // 1. Handled AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  }
  // 2. Zod Schema Validation Errors
  else if (err instanceof ZodError) {
    statusCode = 422;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation error occurred on request payload';
    details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
  }
  // 3. PostgreSQL Database Driver Errors
  else if ('code' in err && typeof (err as { code: unknown }).code === 'string') {
    const pgError = err as { code: string; detail?: string; table?: string };
    statusCode = 400;

    switch (pgError.code) {
      case '23505': // Unique violation
        errorCode = 'UNIQUE_VIOLATION';
        message = 'A record with this identifier or unique attribute already exists.';
        details = { detail: pgError.detail, table: pgError.table };
        break;
      case '23503': // Foreign key violation
        errorCode = 'FOREIGN_KEY_VIOLATION';
        message = 'Referenced related entity does not exist.';
        details = { detail: pgError.detail, table: pgError.table };
        break;
      case '23514': // Check constraint violation
        errorCode = 'CHECK_VIOLATION';
        message = 'Submitted values violate data constraint limits.';
        details = { detail: pgError.detail };
        break;
      case '23P01': // Exclusion / Capacity overrun violation
        statusCode = 409;
        errorCode = 'SLOT_UNAVAILABLE';
        message = 'The selected time slot is no longer available. Another customer just reserved this slot.';
        details = { detail: pgError.detail, table: pgError.table };
        break;
      case 'ECONNREFUSED':
      case '28P01': // Invalid password
      case '3D000': // Database does not exist
        statusCode = 503;
        errorCode = 'DATABASE_UNAVAILABLE';
        message = 'Database service is currently unreachable or rejecting connections.';
        break;
      default:
        statusCode = 500;
        errorCode = 'DATABASE_ERROR';
        break;
    }
  }

  // Log error with correlation ID and stack trace
  const correlationId = req.headers['x-request-id'] || 'none';

  if (statusCode >= 500) {
    logger.error(`[${req.method} ${req.originalUrl}] [ID: ${correlationId}] ${message}`, {
      statusCode,
      errorCode,
      stack: err.stack,
    });
  } else {
    logger.warn(`[${req.method} ${req.originalUrl}] [ID: ${correlationId}] ${message}`, {
      statusCode,
      errorCode,
      details,
    });
  }

  const isDbLeakRisk = ['DATABASE_ERROR', 'UNIQUE_VIOLATION', 'FOREIGN_KEY_VIOLATION', 'CHECK_VIOLATION'].includes(errorCode);
  const safeDetails = config.isDevelopment
    ? details || { stack: err.stack }
    : (isDbLeakRisk ? undefined : details);

  res.status(statusCode).json(
    errorResponse(
      message,
      errorCode,
      safeDetails
    )
  );
};
