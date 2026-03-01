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

  // Seed all NPCs if not present
  await query(`
    INSERT IGNORE INTO npcs (npc_id, npc_file, image) VALUES
      (142857, 'acolyte',          'NPC01.png'),
      (293847, 'adventurer_ghost', 'NPC132A.png'),
      (384756, 'bard',             'NPC321.png'),
      (475869, 'blacksmith',       NULL),
      (516273, 'dockmaster',       'NPC_25o.png'),
      (627384, 'drunk_merchant',   'NPC_asdf.png'),
      (738495, 'dungeon_keeper',   'NPC_ooiop.png'),
      (849516, 'elder',            'NPCada.png'),
      (951627, 'fisherman',        'NPCat32a.png'),
      (162738, 'fishmonger',       'npc1.png'),
      (273849, 'ghost',            'npc2.png'),
      (384951, 'gravedigger',      'npc3.png'),
      (495162, 'guard',            'npc4.png'),
      (516384, 'hedge_wizard',     'NPC01.png'),
      (627495, 'herbalist',        'NPC132A.png'),
      (738516, 'innkeeper',        'NPC321.png'),
      (849627, 'merchant',         'NPC32f1.png'),
      (951738, 'minstrel',         'NPC_25o.png'),
      (162849, 'pilgrim',          'NPC_asdf.png'),
      (273951, 'priest',           'NPC_ooiop.png'),
      (384162, 'ranger',           'NPCada.png'),
      (495273, 'sailor',           'NPCat32a.png'),
      (516495, 'squire',           'npc1.png'),
      (627516, 'stranger',         'npc2.png')
  `);
}
