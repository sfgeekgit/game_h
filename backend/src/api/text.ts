import { Router } from 'express';
import type { Request, Response } from 'express';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEXT_DIR = join(__dirname, '../../../text_content');

const ALLOWED_FILES = new Set(['welcome', 'ui']);

const router = Router();

router.get('/:file', async (req: Request, res: Response) => {
  try {
    const file = String(req.params.file);

    if (!ALLOWED_FILES.has(file)) {
      res.status(404).json({ error: 'Text file not found' });
      return;
    }

    const filePath = join(TEXT_DIR, `${file}.yaml`);
    const content = await readFile(filePath, 'utf-8');
    const parsed = yaml.load(content);

    res.json(parsed);
  } catch (err) {
    console.error('Text loading error:', err);
    res.status(500).json({ error: 'Failed to load text content' });
  }
});

export default router;
