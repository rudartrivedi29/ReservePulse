import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from './env';
import { logger } from '../utils/logger';

export interface DatabasePoolMetrics {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

export interface DatabaseHealthResult {
  isConnected: boolean;
  status: 'connected' | 'disconnected';
  latencyMs: number;
  serverTime?: string;
  version?: string;
  pool: DatabasePoolMetrics;
  error?: string;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: Pool | null = null;

  private constructor() {
    this.initPool();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private initPool(): void {
    try {
      const isRemote =
        !config.database.url.includes('localhost') &&
        !config.database.url.includes('127.0.0.1');
      const requiresSsl =
        isRemote &&
        (config.isProduction ||
          config.database.url.includes('sslmode=require') ||
          process.env.DATABASE_SSL === 'true');

      this.pool = new Pool({
        connectionString: config.database.url,
        max: config.database.poolMax,
        idleTimeoutMillis: config.database.idleTimeoutMs,
        connectionTimeoutMillis: config.database.connectionTimeoutMs,
        ...(requiresSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      });

      this.pool.on('error', (err: Error) => {
        logger.error('Unexpected error on idle PostgreSQL client pool', {
          error: err.message,
          stack: err.stack,
        });
      });

      this.pool.on('connect', () => {
        logger.debug('New PostgreSQL client connection established from pool');
      });
    } catch (err) {
      logger.error('Failed to initialize PostgreSQL pool', {
        error: (err as Error).message,
      });
    }
  }

  public getPool(): Pool {
    if (!this.pool) {
      this.initPool();
    }
    return this.pool!;
  }

  public async query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<R>> {
    const pool = this.getPool();
    const start = Date.now();
    try {
      const res = await pool.query<R>(text, params);
      const duration = Date.now() - start;
      logger.debug(`Executed query in ${duration}ms`, { text, rows: res.rowCount });
      return res;
    } catch (err) {
      const duration = Date.now() - start;
      logger.error(`Query failed after ${duration}ms`, {
        text,
        error: (err as Error).message,
      });
      throw err;
    }
  }

  /**
   * Execute transactional database operations with automatic BEGIN/COMMIT/ROLLBACK
   */
  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();
    const start = Date.now();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      const duration = Date.now() - start;
      logger.debug(`Transaction committed successfully in ${duration}ms`);
      return result;
    } catch (err) {
      const duration = Date.now() - start;
      logger.warn(`Transaction rolling back after ${duration}ms`, {
        error: (err as Error).message,
      });
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        logger.error('Rollback execution failed', { error: (rollbackErr as Error).message });
      }
      throw err;
    } finally {
      client.release();
    }
  }

  public async checkHealth(): Promise<DatabaseHealthResult> {
    const pool = this.getPool();
    const start = Date.now();

    const poolMetrics: DatabasePoolMetrics = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };

    try {
      const res = await pool.query<{ alive: number; server_time: Date; version: string }>(
        'SELECT 1 AS alive, NOW() AS server_time, version() AS version;'
      );

      const latencyMs = Date.now() - start;
      const row = res.rows[0];

      return {
        isConnected: true,
        status: 'connected',
        latencyMs,
        serverTime: row?.server_time?.toISOString() || new Date().toISOString(),
        version: row?.version?.split(' on ')[0] || 'PostgreSQL',
        pool: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount,
        },
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      const errorMessage = (err as Error).message || 'Database connection error';

      logger.warn('Database health check probe failed', {
        error: errorMessage,
        latencyMs,
      });

      return {
        isConnected: false,
        status: 'disconnected',
        latencyMs,
        pool: poolMetrics,
        error: errorMessage,
      };
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      logger.info('Closing PostgreSQL connection pool...');
      await this.pool.end();
      this.pool = null;
      logger.info('PostgreSQL connection pool closed.');
    }
  }
}

export const db = DatabaseManager.getInstance();

export const query = <R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<R>> => db.query<R>(text, params);

export const checkDatabaseHealth = (): Promise<DatabaseHealthResult> => db.checkHealth();

export const closeDatabasePool = (): Promise<void> => db.close();
