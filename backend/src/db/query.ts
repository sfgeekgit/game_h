import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

/**
 * ⚠️ INTERNAL USE ONLY
 * This function is ONLY for express-mysql-session store.
 * DO NOT use this for SQL queries. Use query() instead.
 */
export function getPoolForSessionStore(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'game_h',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'game_h',
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

/**
 * Executes a parameterized SQL query.
 * ⚠️ Use this for ALL SQL queries. DO NOT call pool.execute() directly.
 */
export async function query<T>(sql: string, params: unknown[] = []): Promise<T> {
  const p = getPoolForSessionStore();
  const [rows] = await p.execute(sql, params);
  return rows as T;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
