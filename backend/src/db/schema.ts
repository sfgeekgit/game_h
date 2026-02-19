import { query } from './query.js';

export async function initializeDatabase(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS user_login (
      user_id CHAR(36) PRIMARY KEY,
      email VARCHAR(255) NULL UNIQUE,
      password_hash VARCHAR(255) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS players (
      user_id CHAR(36) PRIMARY KEY,
      display_name VARCHAR(100) NULL,
      points BIGINT DEFAULT 0,
      level INT DEFAULT 1,
      last_area_id INT NULL,
      last_x INT NULL,
      last_y INT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS area_defs (
      area_def_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type ENUM('fixed', 'rogue') NOT NULL DEFAULT 'fixed',
      map_id VARCHAR(100) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS areas (
      area_id INT AUTO_INCREMENT PRIMARY KEY,
      area_def_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed Town Square area_def if not present
  await query(`
    INSERT IGNORE INTO area_defs (area_def_id, name, type, map_id)
    VALUES (1, 'Town Square', 'fixed', 'town_square')
  `);
}
