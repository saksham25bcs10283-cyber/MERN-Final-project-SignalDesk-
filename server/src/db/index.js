import pg from 'pg';

const { Pool } = pg;

let pool = null;

/**
 * Initializes and returns the PostgreSQL connection pool.
 */
export function getPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  if (!pool) {
    // Enable SSL for remote/cloud PostgreSQL (such as Supabase)
    const isRemote = !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

    pool = new Pool({
      connectionString,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[Database Pool Error]:', err.message);
    });
  }

  return pool;
}

/**
 * Executes a parameterized SQL query safely.
 * Throws a descriptive error if DATABASE_URL is not configured.
 */
export async function query(text, params = []) {
  const activePool = getPool();

  if (!activePool) {
    const error = new Error('Database is not configured. Please set DATABASE_URL in server/.env');
    error.statusCode = 503;
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }

  const start = Date.now();
  try {
    const res = await activePool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB Query]', { text: text.slice(0, 80), duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('[DB Query Error]:', { text, error: err.message });
    throw err;
  }
}

/**
 * Checks if the database is configured in the environment.
 */
export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}
