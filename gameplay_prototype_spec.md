# Gameplay Prototype Spec for Claude Code

## Overview

This document describes the gameplay prototype to build on top of the tech stack defined in `tech_stack_spec.md`. Read that document first — this one assumes that foundation is in place.

**Mobile-first is a hard requirement.** The game must look good and run well on mobile phones. All UI decisions should start from a mobile layout and scale up to desktop, not the other way around.

---

## Areas

An **area** is a map the player moves around on. Areas have terrain — some tiles are passable, some are not. Areas may contain NPCs, objects, and other players.

### Area Types

There are two types of areas:

- **Fixed areas** — always the same content. The map is defined once and never changes.
- **Procedurally generated areas** — semi-random, roguelike. Different every time, generated from a seed.

**For this prototype: fixed areas only.** Procedural generation is out of scope.

### Frontend vs Backend Instances

Whether an area runs on the frontend or backend is **not** a property of the area type — it is a property of how a specific *instance* of that area is run. Any area (fixed or procedural) could in principle be instantiated on either side.

- **Frontend instance** — runs entirely client-side. Player moves are processed locally. At the end, results (damage taken, items gained, etc.) are reported to the backend. Frontend instances are always single-player, so they can skip all mutex/locking logic entirely.
- **Backend instance** — every player action goes through the API. The backend advances the area state authoritatively. Multiple players can share the same backend instance and see each other. Backend instances require the full mutex/locking approach described in the Concurrency section.

**For this prototype: build one fixed area, launchable in either mode.** A welcome page presents two buttons: "Play (Frontend)" and "Play (Backend)". Both load the same area and the same map — the only difference is whether moves are processed client-side or via the API.

---


## Database Tables

### area_defs
The template/definition for each area type:

```
area_defs(area_def_id INT AUTO_INCREMENT PK, name VARCHAR(100), type ENUM('fixed','rogue'), map_file VARCHAR(255), created_at DATETIME)
```

- `map_file` — filename of the JSON map definition on disk (e.g. `town_square.json`)
- The actual map content lives in the file, not the DB
- Fixed area map files live in `/shared/maps/`

### areas
A specific running or run instance of an area:

```
areas(area_id INT AUTO_INCREMENT PK, area_def_id INT, created_at DATETIME)
```

- `area_def_id` references `area_defs` (convention only, no foreign key constraint — following the pattern from `tech_stack_spec.md`)

---



Maps are defined as JSON files. They are **not** in `/text_content` — that directory is for author-written text and dialog only. Map files are game data.

Suggested location: `/shared/maps/`

### Map Format

A map is a single JSON object representing the complete state of an area. The same format is used for both the initial file on disk and any runtime snapshot.

The object contains:
- **tiles** — the terrain grid (passable, impassable, etc.)
- **entities** — everything on the map: monsters, NPCs, loot, doors, players, etc. Each entity has a `type` field so they are self-describing and easy to filter. New entity types can be added without changing the structure.

Players are entities on the map like everything else — they live in the same in-memory object. This keeps reads and writes simple: one lock, one object.

### Initial Load vs Runtime State

The map file is the **initial state** — loaded once when an area is instantiated. From that point, the in-memory copy is what gets modified. Saving a snapshot means serializing the current in-memory state back to the same JSON format.

### NPC Dialogue

NPC dialogue trees are stored as separate JSON files (details TBD in a separate spec). For frontend areas, all dialogue trees for NPCs in that area must be loaded when the area first loads. Dialogue data is read-only — it doesn't need mutex locking and never gets written back.

---

## Concurrency & Locking

Map state lives in memory and multiple players may submit moves simultaneously. Node.js is single-threaded, so purely synchronous updates are safe — but any async operation in the middle of an update creates a race condition window.

Use the `async-mutex` package. Create **one mutex per area instance** — not one global mutex. A global mutex would cause players in completely different areas to block each other unnecessarily.

### Critical Section Rules

**Do all async work before acquiring the lock.** Load data, fetch from DB, compute the new state — do all of that first. Only acquire the mutex when you are ready to immediately perform the update. The critical section must contain no `await`, no I/O, no anything that could hang or take time. It should be: read current state, apply pre-computed change, write new state, release.

This must be made explicit in comments in the code. Wherever a mutex is acquired, the surrounding comments should clearly state that no async operations are permitted inside the critical section, and that all inputs must be prepared before acquiring the lock.

```js
// --- DO ALL ASYNC WORK BEFORE THIS LINE ---
// Validate move, fetch anything needed from DB, compute new state here.
// Once the lock is acquired below: no await, no I/O, no slow operations.
const release = await mutex.acquire({ timeout: 5000 });
try {
  // CRITICAL SECTION — synchronous only
  // Read current map state, apply pre-computed update, write back.
  // DO NOT add async operations here. If you think you need to, redesign.
} finally {
  release(); // always release, even on error
}
// --- DB WRITES AND OTHER ASYNC WORK GO AFTER THIS LINE ---
```

### Additional Notes

- Use a 5 second timeout on `mutex.acquire()` as a safety net against hung waiters
- DB writes (e.g. periodic persistence) happen *outside* the critical section, after the lock is released
- Keep critical sections small and fast — if it feels like it needs to be slow, that is a design problem

### One DRY Library for Map Memory Access

The mutex logic must **not** be duplicated. All reads and writes to in-memory map state must go through a single library — the one place in the codebase that knows about mutexes, locking, and the in-memory store. No other code accesses the map state directly.

This mirrors the single DB query wrapper pattern from `tech_stack_spec.md`. The linter should ideally enforce that no file outside this library accesses the in-memory map store directly.

---

## Player State

### Periodic Persistence

In-memory map state resets on server restart. A periodic job will flush state to persistent storage as a safety net. Details TBD.

### Database

The existing `players` table (from `tech_stack_spec.md`) can be extended with columns for last known area and coordinates, used as the persistent fallback.

---

## Multiplayer Visibility (Backend Areas)

When a player fetches the state of a backend-run area, the response includes the positions of all other players currently in that area.

**For this prototype:** no real-time updates. Players refresh (or re-fetch) to see the current map state. This is intentional — polling or WebSocket support can be layered on later without changing the underlying data model.

---

## UI & Controls

### Movement

Movement is one step at a time. The player has a **facing direction** which is always visible on screen — for the prototype, something simple like an arrow or highlighted edge on the player tile is fine.

### Interaction

If the player is adjacent to an entity (NPC, object, etc.), they can interact with it:

- **Tap/click an adjacent entity** — face it and interact in one action
- **Tap/click an empty adjacent tile** — face it and move there
- **Spacebar** — interact with whatever the player is currently facing (if something is there)

### Desktop Controls

- **WASD keys** — move one step, update facing as side effect
- **Click adjacent tile** — move or interact as above
- **Spacebar** — interact with faced entity

### Mobile Controls

- **Tap adjacent tile** — move or interact as above
- **On-screen d-pad** — move one step in that direction, update facing as side effect

Swipe gestures are not required — tap and d-pad are sufficient for the prototype.

---



### Welcome Page

A simple landing page with two buttons:

- **"Play (Frontend)"** — launches the area in frontend mode
- **"Play (Backend)"** — launches the same area in backend mode

Both buttons load the same map and the same area logic. The mode determines where moves are processed.

### The Area — "Town Square"

- A single fixed map (e.g., 20x15)
- Player moves around, navigating impassable terrain
- **Frontend mode:** moves processed client-side using shared logic, results reported to backend on exit
- **Backend mode:** every move is an API call, backend validates and updates player position in memory, other players in the same area are visible on refresh

---

## API Sketch (Backend Area)

Two endpoints are needed at minimum: one to submit a move, one to fetch the current area state. Implementation details are left to the coder.

---

## What This Prototype Proves

1. Shared area logic works identically on both sides
2. Frontend areas can run offline and report results
3. Backend areas can support multiple players seeing each other
4. In-memory position store with periodic persistence works in practice
5. The map JSON format is sufficient for fixed areas
6. The whole thing works well on mobile

---

## Out of Scope for Prototype

- Procedural map generation
- NPCs and interaction
- Combat
- Real-time updates (polling, WebSockets)
- Multiple areas per session
- Area transitions
