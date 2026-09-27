import { createApp } from './app';
import { config } from './config/env';
import { logger } from './utils/logger';
import { closeDatabasePool } from './config/database';

const startServer = () => {
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`ReservePulse Backend running on port ${config.port} [${config.env}]`);
    logger.info(`Health check available at http://localhost:${config.port}/api/v1/health`);
  });

  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    // First stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await closeDatabasePool();
      } catch (err) {
        logger.error('Error closing database pool during shutdown', {
          error: (err as Error).message,
        });
      }
      logger.info('Exiting process cleanly.');
      process.exit(0);
    });

    // Force exit after 10s timeout if hung
    setTimeout(() => {
      logger.error('Forcefully terminating process after shutdown timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer();
