# Build, Lint, and Test

## Quick Start

After making changes, run:

```bash
npm run lint && npm run build -w backend && npm run build -w frontend && npm test
```

## Individual Commands

### Lint
```bash
npm run lint
```
Runs ESLint across the entire codebase.

### Build
```bash
npm run build -w backend   # Backend only
npm run build -w frontend  # Frontend only
```

Build details:
- **Backend**: TypeScript compilation with `tsc`
- **Frontend**: TypeScript compilation + Vite bundle

### Test
```bash
npm test                   # All workspaces
npm run test:shared       # Shared only
npm run test:backend      # Backend only
npm run test:frontend     # Frontend only
```

## Deploy

  The frontend needs to be rebuilt — just restarting the server doesn't recompile the Vite app. Run
  cd /home/game_h
  npm run build -w frontend
  sudo systemctl restart game_h
  
After building, restart the service to serve the new code:

```bash
sudo systemctl restart game_h
```

Both frontend and backend compile `shared/` TypeScript directly — each workspace picks up shared changes at its own build time.

## Development

### Backend
```bash
npm run dev:backend       # tsx watch with hot reload
npm run start             # Run compiled code
```

### Frontend
```bash
npm run dev:frontend      # Vite dev server
npm run preview           # Preview production build
```

## Format Code

```bash
npm run format            # Auto-fix formatting
npm run format:check      # Check formatting issues
```
