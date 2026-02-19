import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
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

export async function query<T>(sql: string, params: unknown[] = []): Promise<T> {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows as T;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
