# Migration Instructions: Copy to New Game Directory

**Template for copying this game to a new directory.**

Before starting, define your variables:
- **OLD_GAME** = Current directory (e.g., `game_h`)
- **NEW_GAME** = Target directory (e.g., `game_j`)
- **OLD_PORT** = Current Express port (e.g., `3002`)
- **NEW_PORT** = New Express port (e.g., `3004`)

---

## Pre-Migration: Fix References in Current Directory

**Check for old game references:**
```bash
cd /home/OLD_GAME
grep -ri 'PREVIOUS_GAME' . --exclude-dir=node_modules --exclude-dir=.git
```

Fix any found before copying forward (they'll propagate to the new game).

**Known issues from past migrations:**
- `frontend/public/manifest.json` - Check "name" and "short_name"
- `frontend/index.html` - Check title
- `frontend/dist/` - Check same files (rebuilt versions)

---

## Step 1: Copy Files

```bash
# Create target directory (needs sudo, then fix ownership)
sudo mkdir -p /home/NEW_GAME
sudo chown cc:cc /home/NEW_GAME

# Copy everything except git and build artifacts
rsync -av \
  --exclude='.git' \
  --exclude='.gitignore' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='*.log' \
  /home/OLD_GAME/ /home/NEW_GAME/

# Copy .gitignore separately (we DO want this)
cp /home/OLD_GAME/.gitignore /home/NEW_GAME/
```

**CRITICAL: Verify `.gitignore` was actually copied before continuing:**
```bash
ls -la /home/NEW_GAME/.gitignore
cat /home/NEW_GAME/.gitignore  # should list .env, .db_credentials, node_modules, etc.
```

If it's missing, copy it manually. **Do not run `git init` until `.gitignore` is confirmed present.**
Committing without it will put secrets and large files into the repo.

**Also copy NPC portrait images** (these are gitignored and not in the repo):
```bash
rsync -av /home/OLD_GAME/frontend/public/npcs/ /home/NEW_GAME/frontend/public/npcs/
```

**What gets copied:**
- ✅ All source code (backend, frontend, shared)
- ✅ Config files (package.json, tsconfig, eslint, prettier, vitest)
- ✅ Documentation (SERVER.md, DEVELOPMENT.md, specs, this file)
- ✅ .gitignore (for future git init if needed)
- ✅ .db_credentials (will need updating)
- ✅ NPC images (copied separately above — gitignored, not in repo)
- ❌ .git directory (explicitly excluded)
- ❌ node_modules (will run npm install fresh)
- ❌ dist (will rebuild)

---

## Step 2: Update All References OLD_GAME → NEW_GAME

**Search comprehensively:**
```bash
cd /home/NEW_GAME

# Find all variations of the old game name
grep -r 'OLD_GAME' . --exclude-dir=node_modules --exclude-dir=.git
grep -r 'old.game' . --exclude-dir=node_modules --exclude-dir=.git
grep -r 'OldGame' . --exclude-dir=node_modules --exclude-dir=.git
grep -r 'Old Game' . --exclude-dir=node_modules --exclude-dir=.git

# IMPORTANT: Also search for the old port number (not caught by name grep)
grep -r 'OLD_PORT' . --exclude-dir=node_modules --exclude-dir=.git --include='*.ts' --include='*.json'

# Replace in each file found
```

**Common locations to check:**

### Frontend
- `frontend/public/manifest.json` - "name" and "short_name" fields
- `frontend/index.html` - `<title>` tag
- `frontend/vite.config.ts` - `base` path AND proxy target port (won't be caught by name grep — must update port manually)
- `frontend/dist/manifest.json` - Same (if dist exists)
- `frontend/dist/index.html` - Same (if dist exists)

### Backend
- `backend/src/server.ts` - Default PORT value
- `backend/src/auth/session.ts` - Cookie name (e.g., `game_x_session`)
- `backend/src/db/query.ts` - Default DB_NAME value

### Root
- `package.json` - "name" field
- `.db_credentials` - (will be replaced with new password)
- `SERVER.md` - **Complete rewrite** (see Step 6)
- `CLAUDE.md` - Tracked in git, so it forks along with the code. Contains the source repo's dev DB password, dev systemd service names, and dev ports. Update **before** agents read it — a wrong DB password here leads to backend startup failures that look mysterious until you trace them back.

---

## Step 3: Caddy Configuration

**Add to `/etc/caddy/Caddyfile` inside `documentbrain.com {}` block:**

```caddy
    # Handle /NEW_GAME/api/* - proxy to Express
    handle /NEW_GAME/api/* {
        uri strip_prefix /NEW_GAME
        reverse_proxy 127.0.0.1:NEW_PORT
    }

    # Handle /NEW_GAME/content/* - serve text_content files
    handle /NEW_GAME/content/* {
        root * /home/NEW_GAME
        uri strip_prefix /NEW_GAME
        header Cache-Control "no-cache, no-store, must-revalidate"
        file_server
    }

    # Handle /NEW_GAME/* - serve React build
    handle /NEW_GAME/* {
        root * /home/NEW_GAME/frontend/dist
        uri strip_prefix /NEW_GAME
        try_files {path} /index.html
        file_server
    }

    # Redirect /NEW_GAME to /NEW_GAME/
    handle /NEW_GAME {
        redir * /NEW_GAME/ permanent
    }
```

**Insert location:** After the most recent game block

**CRITICAL:** Do NOT modify any other site configurations. Only add new game block.

**Validate and reload Caddy:**
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## Step 4: Create systemd Service

**Generate secrets first:**
```bash
openssl rand -base64 48   # SESSION_SECRET
openssl rand -base64 32   # DB_PASSWORD (use this in Step 5 too)
```

**Create `/etc/systemd/system/NEW_GAME.service`:**

```ini
[Unit]
Description=NEW_GAME Express Server
After=network.target mysql.service

[Service]
Type=simple
User=cc
WorkingDirectory=/home/NEW_GAME
Environment="NODE_ENV=production"
Environment="PORT=NEW_PORT"
Environment="SESSION_SECRET=GENERATED_SECRET"
Environment="DB_PASSWORD=GENERATED_PASSWORD"
Environment="DB_USER=NEW_GAME"
Environment="DB_NAME=NEW_GAME"
Environment="CORS_ORIGIN=https://documentbrain.com"
ExecStart=/usr/bin/node --import tsx /home/NEW_GAME/backend/src/server.ts
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

**Note:** Secrets go directly in the service file (owned by root, never in git) — not in a `.env`
file. This matches the pattern used by all other game instances on this server.

**Note:** The service runs TypeScript directly via tsx (not compiled JavaScript), so the backend
build step is optional. However, building helps verify the code compiles without errors.

---

## Step 5: Database Setup

**Create database and user** (use the same DB_PASSWORD generated in Step 4):
```bash
sudo mariadb -u root -e "
  CREATE DATABASE NEW_GAME;
  CREATE USER 'NEW_GAME'@'localhost' IDENTIFIED BY 'GENERATED_PASSWORD';
  GRANT ALL PRIVILEGES ON NEW_GAME.* TO 'NEW_GAME'@'localhost';
  FLUSH PRIVILEGES;
"
```

**Store DB password for reference** (the service reads it from the systemd unit, but keep a copy):
```bash
echo 'GENERATED_PASSWORD' > /home/NEW_GAME/.db_credentials
chmod 600 /home/NEW_GAME/.db_credentials
```

**Enable and start service** (this runs `initializeDatabase()` which creates all table structures):
```bash
sudo systemctl daemon-reload
sudo systemctl enable NEW_GAME
sudo systemctl start NEW_GAME
sudo systemctl status NEW_GAME  # verify it started cleanly
```

**Copy catalog tables from OLD_GAME** (AFTER the service has started and created table structures):
```bash
sudo mariadb-dump -u root OLD_GAME npcs wep_types spell_types | sudo mariadb -u root NEW_GAME
sudo systemctl restart NEW_GAME  # reload catalog into memory
```

These three tables are DB-owned catalog data — NPC portrait assignments, weapon stats, and spell
stats. `schema.ts` creates the table structures but leaves them empty. They must be populated by
dumping from the source game. If migrating to a fresh game with no source to dump from, insert
rows manually or via the npc_admin tool.

**Note:** If the new game's DB already has rows in these tables (e.g. from a partial migration),
truncate first to avoid conflicts:
```bash
sudo mariadb -u root -e "TRUNCATE TABLE NEW_GAME.npcs; TRUNCATE TABLE NEW_GAME.wep_types; TRUNCATE TABLE NEW_GAME.spell_types;"
sudo mariadb-dump -u root OLD_GAME npcs wep_types spell_types | sudo mariadb -u root NEW_GAME
sudo systemctl restart NEW_GAME
```

---

## Step 6: Update SERVER.md

**In `/home/NEW_GAME/SERVER.md`, update:**

1. URL: `https://documentbrain.com/NEW_GAME/`
2. Port: `OLD_PORT` → `NEW_PORT`
3. Service name: `OLD_GAME.service` → `NEW_GAME.service`
4. Database: `OLD_GAME` → `NEW_GAME`
5. Cookie name: `old_game_session` → `new_game_session`
6. All paths: `/home/OLD_GAME/` → `/home/NEW_GAME/`
7. Service table: Update Express service name
8. Ports in use: Add NEW_PORT to the list

---

## Step 7: Build and Deploy

**In /home/NEW_GAME/:**

```bash
# Install dependencies
npm install

# Build frontend (required - serves static files)
VITE_BASE=/NEW_GAME/ npm run build -w frontend

# Build backend (optional - service runs TypeScript via tsx)
# Useful to verify code compiles without errors
npm run build -w backend

# Verify service is running
sudo systemctl status NEW_GAME
```

**Test:**
- `https://documentbrain.com/NEW_GAME/` - Should serve frontend
- `https://documentbrain.com/NEW_GAME/api/health` - Should return backend health status

---

## Step 8: Git Setup

**If running git commands as root on a directory owned by `cc`, add the safe directory exception first:**
```bash
git config --global --add safe.directory /home/NEW_GAME
```

**Initialize repo and push:**
```bash
cd /home/NEW_GAME
git init
git branch -m main          # default branch is 'master' — rename to 'main'
git add .
git commit -m "Initial commit: NEW_GAME forked from OLD_GAME"
git remote add origin git@github.com:sfgeekgit/NEW_GAME.git
git push -u origin main     # -u sets upstream so future 'git push' needs no arguments
```

---

## Port Assignment Reference

Check `/etc/caddy/Caddyfile` and `/etc/systemd/system/` for existing ports.

**Pattern:** Each game gets unique port starting from 3001:
- game_g → 3001
- game_h → 3002
- game_i → 3003
- game_j → 3004
- game_kastle → 3006
- (etc.)

---

## Verification Checklist

After migration:

- [ ] `/home/NEW_GAME/` directory exists with all files
- [ ] No `.git` directory in NEW_GAME (until Step 8)
- [ ] `.gitignore` present and verified — contains `.env`, `.db_credentials`, `node_modules`, etc.
- [ ] NPC portrait images copied to `frontend/public/npcs/`
- [ ] All "OLD_GAME" references changed to "NEW_GAME" in new directory
- [ ] All "Old Game" references changed to "New Game" in new directory
- [ ] Database `NEW_GAME` created with schema
- [ ] Catalog tables (`npcs`, `wep_types`, `spell_types`) populated from OLD_GAME dump
- [ ] systemd service `NEW_GAME` running (secrets in unit file, not `.env`)
- [ ] Caddy config updated (only NEW_GAME block added)
- [ ] Caddy validated and reloaded successfully
- [ ] https://documentbrain.com/NEW_GAME/ loads
- [ ] API endpoints work
- [ ] Registration/login works
- [ ] Frontend connects to backend
- [ ] SERVER.md updated in NEW_GAME directory
- [ ] Re-run grep to verify NO old references remain

---

## Common Mistakes to Avoid

Based on past migrations:

1. ❌ Missing manifest.json name updates
2. ❌ Missing short_name updates
3. ❌ Missing HTML title updates
4. ❌ Not rebuilding frontend after changes (or missing `VITE_BASE=/NEW_GAME/` when building)
5. ❌ Forgetting to update cookie name (breaks sessions)
6. ❌ Wrong port in server.ts default
7. ❌ Wrong port in vite.config.ts proxy target (not caught by name grep — must check manually)
8. ❌ Not updating SERVER.md completely
9. ❌ Declaring done without comprehensive grep check
10. ❌ Missing `.gitignore` before `git init` — secrets and large files end up committed
11. ❌ Starting service before catalog dump — server crashes on missing wep_types/spell_types rows
12. ❌ Not copying NPC portrait images (gitignored, must be rsync'd separately)
13. ❌ Forgetting `git branch -m main` — repo starts on `master` not `main`
14. ❌ Using `.env` file for secrets — use hardcoded `Environment=` lines in the systemd unit file

**Solution:** Use grep extensively. Search for every variation of the old game name.

---

## Example: game_h → game_j

```bash
OLD_GAME=game_h
NEW_GAME=game_j
OLD_PORT=3002
NEW_PORT=3004

# Follow all steps above with these values
```
