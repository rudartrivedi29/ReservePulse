import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// Extend Express Request to include requestId
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Attaches a unique correlation ID to every incoming request
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existingId = req.headers['x-request-id'] as string;
  const requestId = existingId || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

// Custom morgan token for request correlation ID
morgan.token('req-id', (req: Request) => req.id || (req.headers['x-request-id'] as string) || '-');

const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export const requestLogger = morgan(
  ':remote-addr [:req-id] :method :url :status :res[content-length]b - :response-time ms',
  {
    stream,
    skip: (req: Request) => req.url === '/api/v1/health/ping', // Suppress noisy liveness pings
  }
);
