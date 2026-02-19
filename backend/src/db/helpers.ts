import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { query } from './query.js';

export interface UserRow extends RowDataPacket {
  user_id: string;
  email: string | null;
  password_hash: string | null;
  created_at: Date;
}

export interface PlayerRow extends RowDataPacket {
  user_id: string;
  display_name: string | null;
  points: number;
  level: number;
  last_area_id: number | null;
  last_x: number | null;
  last_y: number | null;
  updated_at: Date;
}

export interface AreaDefRow extends RowDataPacket {
  area_def_id: number;
  name: string;
  type: 'fixed' | 'rogue';
  map_id: string;
  created_at: Date;
}

export interface AreaRow extends RowDataPacket {
  area_id: number;
  area_def_id: number;
  created_at: Date;
}

// --- User helpers ---

export async function createUser(userId: string): Promise<void> {
  await query<ResultSetHeader>('INSERT INTO user_login (user_id) VALUES (?)', [userId]);
}

export async function getUserById(userId: string): Promise<UserRow | null> {
  const rows = await query<UserRow[]>('SELECT * FROM user_login WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await query<UserRow[]>('SELECT * FROM user_login WHERE email = ?', [email]);
  return rows[0] || null;
}

export async function registerUser(
  userId: string,
  email: string,
  passwordHash: string,
): Promise<void> {
  await query<ResultSetHeader>(
    'UPDATE user_login SET email = ?, password_hash = ? WHERE user_id = ?',
    [email, passwordHash, userId],
  );
}

// --- Player helpers ---

export async function createPlayer(userId: string): Promise<void> {
  await query<ResultSetHeader>('INSERT INTO players (user_id) VALUES (?)', [userId]);
}

export async function getPlayerById(userId: string): Promise<PlayerRow | null> {
  const rows = await query<PlayerRow[]>('SELECT * FROM players WHERE user_id = ?', [userId]);
  return rows[0] || null;
}

export async function updatePlayer(userId: string, points: number, level: number): Promise<void> {
  await query<ResultSetHeader>('UPDATE players SET points = ?, level = ? WHERE user_id = ?', [
    points,
    level,
    userId,
  ]);
}

export async function updatePlayerPosition(
  userId: string,
  areaId: number,
  x: number,
  y: number,
): Promise<void> {
  await query<ResultSetHeader>(
    'UPDATE players SET last_area_id = ?, last_x = ?, last_y = ? WHERE user_id = ?',
    [areaId, x, y, userId],
  );
}

// --- Area helpers ---

export async function getAreaDefById(areaDefId: number): Promise<AreaDefRow | null> {
  const rows = await query<AreaDefRow[]>(
    'SELECT * FROM area_defs WHERE area_def_id = ?',
    [areaDefId],
  );
  return rows[0] || null;
}

/** Find the single persistent area instance for a given area_def, or null if none exists. */
export async function getPersistentArea(areaDefId: number): Promise<AreaRow | null> {
  const rows = await query<AreaRow[]>(
    'SELECT * FROM areas WHERE area_def_id = ? ORDER BY area_id ASC LIMIT 1',
    [areaDefId],
  );
  return rows[0] || null;
}

export async function createArea(areaDefId: number): Promise<number> {
  const result = await query<ResultSetHeader>(
    'INSERT INTO areas (area_def_id) VALUES (?)',
    [areaDefId],
  );
  return result.insertId;
}
