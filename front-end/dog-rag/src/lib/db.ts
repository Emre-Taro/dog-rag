// db.ts
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    // Configure pool with SSL for AWS RDS
    const poolConfig: any = {
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    // If connecting to AWS RDS, enable SSL
    if (connectionString.includes('rds.amazonaws.com') || connectionString.includes('amazonaws.com')) {
      // If SSL is not already specified in the connection string, add it
      if (!connectionString.includes('sslmode=') && !connectionString.includes('ssl=')) {
        poolConfig.ssl = {
          rejectUnauthorized: false, // AWS RDS uses self-signed certificates
        };
      }
    }

    pool = new Pool(poolConfig);
  }
  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function query(text: string, params?: any[]) {
  const db = getDbPool();
  const start = Date.now();
  try {
    const res = await db.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error', { text, error });
    throw error;
  }
}
