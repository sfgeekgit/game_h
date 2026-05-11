import { query } from './query.js';

export async function initializeDatabase(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS user_login (
      user_id INT PRIMARY KEY,
      email VARCHAR(255) NULL UNIQUE,
      password_hash VARCHAR(255) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS players (
      user_id INT PRIMARY KEY,
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

  await query(`
    CREATE TABLE IF NOT EXISTS npcs (
      npc_id   INT PRIMARY KEY,
      npc_file VARCHAR(50) UNIQUE NOT NULL,
      image    VARCHAR(255) NULL
    )
  `);

  // Seed all area_defs if not present
  await query(`
    INSERT IGNORE INTO area_defs (area_def_id, name, type, map_id) VALUES
      (1,  'Town Square',        'fixed', 'town_square'),
      (2,  'The Rusty Flagon',   'fixed', 'tavern'),
      (3,  'The Marketplace',    'fixed', 'marketplace'),
      (4,  'Forest Path',        'fixed', 'forest_path'),
      (5,  'Castle Gates',       'fixed', 'castle_gates'),
      (6,  'The Docks',          'fixed', 'docks'),
      (7,  'Herbalist Garden',   'fixed', 'herbalist_garden'),
      (8,  'The Graveyard',      'fixed', 'graveyard'),
      (9,  'Temple of Virtue',   'fixed', 'temple'),
      (10, 'Dungeon Entrance',   'fixed', 'dungeon_entrance')
  `);

  // Combat catalog tables — structure only, no seed data.
  // wep_types, spell_types, and npcs are DB-owned catalog data populated via
  // mariadb-dump from an existing game instance. See docs/MIGRATION_INSTRUCTIONS.md.
  await query(`
    CREATE TABLE IF NOT EXISTS wep_types (
      id             BIGINT NOT NULL,
      \`key\`        VARCHAR(32) NOT NULL,
      name           VARCHAR(64) NOT NULL,
      damage         INT DEFAULT 0,
      cast_time      DECIMAL(4,1) DEFAULT 0.0,
      reach          INT NOT NULL DEFAULT 1,
      anim           VARCHAR(32) NOT NULL DEFAULT '',
      anim_ms        INT NOT NULL DEFAULT 400,
      anim_particles INT NOT NULL DEFAULT 8,
      PRIMARY KEY (id),
      UNIQUE KEY uk_wep_key (\`key\`)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS spell_types (
      id             BIGINT NOT NULL,
      \`key\`        VARCHAR(32) NOT NULL,
      name           VARCHAR(64) NOT NULL,
      damage         INT DEFAULT 0,
      mana_cost      INT DEFAULT 0,
      cast_time      DECIMAL(4,1) DEFAULT 0.0,
      reach          INT DEFAULT 0,
      aoe_radius     INT DEFAULT 0,
      aoe_shape      VARCHAR(16) DEFAULT NULL,
      target_type    VARCHAR(16) DEFAULT 'tile',
      anim           VARCHAR(32) NOT NULL DEFAULT '',
      anim_ms        INT NOT NULL DEFAULT 400,
      anim_particles INT NOT NULL DEFAULT 8,
      PRIMARY KEY (id),
      UNIQUE KEY uk_spell_key (\`key\`)
    )
  `);
}
