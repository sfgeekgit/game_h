# Development Guidelines

## Testing

**Run tests:**
```bash
npm test              # All workspaces
npm run test:shared   # Shared logic only
npm run test:backend  # Backend API only
npm run test:frontend # Frontend only
```

**Test locations:**
- `shared/src/__tests__/` - Movement, combat, stats
- `backend/src/__tests__/` - API integration tests
- `frontend/src/__tests__/` - React component tests

**Testing framework:** Vitest

**When to run tests:**
- After changing core logic (movement, combat, stats)
- After modifying API endpoints
- Before committing (recommended, not enforced)

---

## Linting

**Run linting:**
```bash
npm run lint          # Check for errors
npm run format        # Auto-fix formatting
npm run format:check  # Check formatting without fixing
```

**Config:** `eslint.config.mjs` in root

**Key rules:**
- TypeScript strict mode
- React hooks rules (frontend only)
- **Architecture enforcement:** Only `backend/src/db/` may import mysql2

**When to run lint:**
- Before committing (recommended, not enforced)
- After adding new files
- When you see inconsistent formatting

---

## Architecture Rules

### SQL Queries
- ✅ **REQUIRED:** All SQL must go through `backend/src/db/query.ts`
- ❌ **BLOCKED:** Importing mysql2 outside `backend/src/db/` (ESLint enforces this)

### Why These Rules Exist
- Centralized query logging/monitoring
- Prevents SQL injection via parameterized queries
- Enforces consistent error handling
- Makes testing easier (single mock point)

---

## Current Enforcement

**Automated:** ESLint blocks mysql2 imports outside `backend/src/db/`

**Manual (recommended):** Run `npm test` and `npm run lint` before commits

**Not enforced:** No pre-commit hooks or CI/CD pipeline (by design)
