import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { requestIdMiddleware, requestLogger } from './middleware/requestLogger.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';
import { apiRouter } from './routes';

export const createApp = (): Application => {
  const app = express();

  // Hide server fingerprint
  app.disable('x-powered-by');

  // Security headers
  app.use(helmet());

  // Attach unique correlation ID to all incoming requests
  app.use(requestIdMiddleware);

  // CORS configuration
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // HTTP request logging
  app.use(requestLogger);

  // Root welcome route
  app.get('/', (req, res) => {
    res.json({
      name: 'ReservePulse API Service',
      version: '1.0.0',
      status: 'active',
      endpoints: {
        apiV1: '/api/v1',
        health: '/api/v1/health',
        ping: '/api/v1/health/ping',
        database: '/api/v1/health/database',
      },
    });
  });

  // Mount API v1 routes with rate limiting protection
  app.use('/api/v1', apiRateLimiter, apiRouter);

  // 404 Catch-all handler
  app.use(notFoundHandler);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
