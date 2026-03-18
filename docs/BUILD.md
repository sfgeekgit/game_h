# Build, Lint, and Test

## Development Workflow

**Claude Code should NEVER run `npm run build` or `sudo systemctl restart game_h`.**
All development and testing happens on the dev servers below. Claude reminds the user
to deploy when a feature is complete — it does not deploy itself.

Test everything at: **https://documentbrain.com/game_h_dev/**

### Start the frontend dev server (port 5173)
```bash
cd /home/game_h && npm run dev -w frontend
```

### Start the backend dev server (port 3012)
```bash
cd /home/game_h
SESSION_SECRET="K6iBttoa/a1YohzKKhoQKvYM7KSS3o57xKRK12gYHy9uP1UeG7KJ15531gl61nqr" \
DB_PASSWORD="V9cYMvDNBP8qexDIR1pa4XF+eISubZvU" \
CORS_ORIGIN="https://documentbrain.com" \
PORT=3012 \
npx tsx watch backend/src/server.ts
```

Backend changes hot-reload automatically. Frontend changes appear instantly via Vite HMR.

The production URL (`https://documentbrain.com/game_h/`) is unaffected and keeps
serving the last production build while you work.

---

## Production Deploy (user runs this, not Claude)

When you are satisfied with changes and want to push them live:
```bash
cd /home/game_h && npm run build -w backend && npm run build -w frontend && sudo systemctl restart game_h
```

This compiles both workspaces and restarts the service. The production URL will then
serve the new code.

---

## Individual Commands

### Lint
```bash
npm run lint
```

### Build
```bash
npm run build -w backend   # Backend only
npm run build -w frontend  # Frontend only (production bundle)
```

### Test
```bash
npm test                   # All workspaces
npm run test:shared        # Shared only
npm run test:backend       # Backend only
npm run test:frontend      # Frontend only
```

Both frontend and backend compile `shared/` TypeScript directly — each workspace
picks up shared changes at its own build time.

## Format Code

```bash
npm run format            # Auto-fix formatting
npm run format:check      # Check formatting issues
```
