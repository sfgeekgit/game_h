# Tech Stack Spec for Claude Code

## Overview

Set up a full-stack TypeScript project. One language everywhere. Keep it simple.

## Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript (everywhere) |
| Frontend | React |
| Backend | Express.js |
| Database | MySQL |
| Build (frontend) | Vite |
| Linting | ESLint + Prettier |
| Testing | Vitest (+ React Testing Library for frontend) |

## Architecture: MVCT

This project follows an MVCT pattern — Model, View, Controller, plus Text.

| Layer | What it is | Location |
|-------|------------|----------|
| **Model** | Game state, data structures | `/shared`, `/backend` |
| **View** | UI presentation, components | `/frontend` |
| **Controller** | Game logic, API routes | `/shared`, `/backend/api` |
| **Text** | All game text, dialog, descriptions | `/text_content` |

Text is fully separated from logic and presentation. A writer edits `/text_content` without touching code. The game loads text from these files at runtime.

## Project Structure

```
/project
  /shared           # Game logic (TypeScript) — imported by both frontend and backend
  /backend          # Express server (TypeScript)
    /db             # Database wrapper (see below)
    /api            # API routes
    /auth           # Auth/session logic
  /frontend         # React app (TypeScript)
    /src
      /components
  /text_content     # ALL game text lives here (the "T" in MVCT)
```

**Important:** No game text in `/shared`, `/backend`, or `/frontend`. All human-readable strings come from `/text_content`.

## Database Access

All MySQL access goes through a single wrapper function. This is the only place that connects to the database.

```
/backend/db/query.ts   # The ONE function that executes SQL
/backend/db/helpers.ts # Simple helper functions (getPlayerById, savePlayer, etc.) that call the wrapper
```

**Linter must enforce:** No file outside `/backend/db/` imports mysql2 directly.

## Auth & Sessions

Use standard Node packages:
- express-session (sessions)
- express-mysql-session (session store — not MemoryStore)
- Passport.js (auth)
- bcrypt (password hashing)

**Anonymous-first flow:**
1. Player visits — automatically create account with random ID
2. Store user ID in session cookie (persists across browser close/reopen — player returns next day, picks up where they left off)
3. Player can optionally register later (add email/password to existing account)
4. Registration "claims" their anonymous account — no data loss

## Shared Code

The `/shared` directory contains game logic that runs on both frontend and backend:
- Combat calculations
- Stat formulas
- Any logic that needs to match exactly on both sides

Frontend imports it for fast local simulation (small fights).
Backend imports it for authoritative validation (big fights).

## Server-Authoritative Architecture

**The backend is always the source of truth.**

- Frontend is untrusted — assume players can modify client code
- Small jobs may run on frontend for responsiveness (e.g., minor combat, animations)
- Backend validates all important actions and results
- If frontend and backend disagree, backend wins
- All persistent state changes must go through backend

## Separation of Concerns (MVCT)

| Layer | What it is | Location | Who edits it |
|-------|------------|----------|--------------|
| Model | Game state, data | `/shared`, `/backend` | Developer |
| View | UI components, styling | `/frontend` | Developer, Designer |
| Controller | Logic, API, rules | `/shared`, `/backend/api` | Developer |
| Text | All game text | `/text_content` | Writer |

**Text layer rules:**
- All game text and dialog lives in `/text_content` in human-readable markup (Markdown or YAML)
- A writer with small code knowledge can edit these files
- Never hardcode dialog, descriptions, or UI strings in TypeScript or JSX
- Code references text by keys, loads content at runtime

## Mobile & PWA

- Mobile-first responsive design
- Add PWA manifest + service worker for "install to home screen"
- Build for web first, later wrap with Capacitor for iOS/Android App Store

## Testing

Full test coverage. Agent writes tests as it builds features.

- Backend: Vitest
- Frontend: Vitest + React Testing Library  
- Shared: Vitest (same tests can run against shared logic)

## Linting

ESLint + Prettier, standard configs.

Custom ESLint rule: only `/backend/db/` may import mysql2.

## What NOT to Include

- No Docker (unless asked)
- No CI/CD (for now)
- No Redis (structure code to add later, but don't add now)
- No ORM — raw SQL only, through the single wrapper
- No rate limiting in prototype (optional — add if desired, especially for auth endpoints)

## Security Basics

Keep it minimal for prototype, but include:

- **Session security:** Regenerate session on auth state changes (anonymous → registered). Use express-mysql-session (not MemoryStore).
- **Cookies:** HttpOnly, SameSite=Lax, Secure in production
- **CSRF:** SameSite cookies are sufficient for prototype
- **Headers:** Use helmet for basic security headers
- **Errors:** Never leak stack traces, SQL errors, or internal paths to client
- **Input validation:** Validate all input on backend (type, length, range)
- **text_content access:** Whitelist allowed files, don't allow arbitrary path requests

## Deployment Notes

- Create `.gitignore` from the start
- Create `SERVER.md` (gitignored) for server-specific deployment details
- Initial setup includes running the prototype behind Caddy — document Caddy config in SERVER.md. Do not change anything else running on this box — other sites currently being served should remain unchanged. Follow existing patterns in the current Caddyfile and add a route for this game using a sub-URL matching the game title.
- MySQL: If MySQL is already installed, create a new database matching the game title. Unless otherwise specified, the game title is the project directory name.
- Environment variables needed: SESSION_SECRET, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
- Each game instance needs a unique port — update server.ts default and SERVER.md together
- CORS: Configure for your frontend origin

## Deployment Details

- Create a systemd service file for the Express backend
- Caddy reverse proxy setup:
  - `/game_title/api/*` → strip prefix → proxy to Express (includes text_content API — server controls whitelist)
  - `/game_title/*` → serve frontend/dist/ with try_files for SPA routing
- Set Vite `base` config to match the URL prefix (e.g., `base: '/game_title/'`)
- Frontend API client must derive its base URL from Vite's BASE_URL
- Set `trust proxy: 1` on Express when behind a reverse proxy
- Build frontend before deploying: `npm run build -w frontend`
- **Important:** Hardcode session cookie `path: '/'` — do not make it configurable. The reverse proxy strips the URL prefix, so Express never sees it, and express-session will silently refuse to create sessions if the path doesn't match.

## Database Tables

Prototype tables — expand as needed:

```
user_login(user_id CHAR(36) PK, email VARCHAR(255) NULL UNIQUE,
           password_hash VARCHAR(255) NULL, created_at DATETIME)

players(user_id CHAR(36) PK, display_name VARCHAR(100) NULL,
        updated_at DATETIME)
```

1:1 by user_id (UUID). No foreign key constraint — convention only.

## Goal

A minimal working skeleton where:
1. Express serves an API
2. React renders a page that talks to that API
3. Shared game logic works on both sides
4. Auth works (anonymous + optional registration)
5. MySQL connected through single wrapper
6. Tests and linting in place
7. Ready to build game features

Keep it simple. Less is more.
