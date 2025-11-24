// Database configuration and connection utilities
// This file will handle PostgreSQL connections

import { Pool } from 'pg';

// Database connection pool
let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'dog_rag_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

// Close the pool (useful for cleanup)
export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Helper function to execute queries
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

