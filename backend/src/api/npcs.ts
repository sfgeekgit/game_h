import { Router } from 'express';
import type { Request, Response } from 'express';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

/// TO DO! Lock this down or remove it. Someday make a proper admin section with auth
// But currently, who cares. 


const __dirname = dirname(fileURLToPath(import.meta.url));
const NPC_DIR = join(__dirname, '../../../text_content/npcs');

interface NpcListItem {
  npcId: string;
  name: string;
  look: string;
  imageFile: string;
}

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const files = (await readdir(NPC_DIR))
      .filter((fileName) => fileName.endsWith('.yaml'))
      .sort((a, b) => a.localeCompare(b));

    const npcs: NpcListItem[] = await Promise.all(files.map(async (fileName) => {
      const npcId = fileName.replace(/\.yaml$/, '');
      const raw = await readFile(join(NPC_DIR, fileName), 'utf8');
      const parsed = (yaml.load(raw) as {
        name?: string;
        dialogue?: { look?: string };
      }) ?? {};

      return {
        npcId,
        name: typeof parsed.name === 'string' ? parsed.name : npcId,
        look: typeof parsed.dialogue?.look === 'string' ? parsed.dialogue.look : '',
        imageFile: `${npcId}.png`,
      };
    }));

    res.json({ npcs });
  } catch (err) {
    console.error('NPC list error:', err);
    res.status(500).json({ error: 'Failed to load NPC list' });
  }
});

export default router;
