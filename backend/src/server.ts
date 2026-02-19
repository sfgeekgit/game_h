import { createApp } from './app.js';
import { initializeDatabase } from './db/schema.js';

const PORT = parseInt(process.env.PORT || '3003');

async function main() {
  await initializeDatabase();
  const app = createApp();
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
