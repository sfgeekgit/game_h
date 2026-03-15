# Frontend vs Backend Architecture

> **Reading guide:** Sections marked **[CURRENT]** describe code that exists today.
> Sections marked **[PLANNED]** describe the intended design that is not yet implemented.

---

## The Core Idea [CURRENT]

The game has two play modes that use **identical shared code** but differ in where game logic executes:

- **Frontend mode** ("Single-player") — the full area map is downloaded once. Every player action (movement, etc.) is processed locally in the browser using the shared game logic. The player can move around freely without any network calls as long as they stay in that area.
- **Backend mode** ("Multiplayer") — every player action is sent to the server. The backend processes it authoritatively, returns the result, and the client re-renders. Multiple players share the same area instance and can see each other.

---

## Security / Trust Model [CURRENT]

**The backend is always the source of truth. We do not trust frontend clients.**

Frontend mode is a convenience for single-player exploration, not a trusted execution environment. When a frontend session ends (player exits an area, closes the tab, etc.), any relevant results are reported to the backend — but the backend is free to validate or ignore them.

Never move security-sensitive logic (combat outcomes, item grants, progression) to frontend-only paths without backend validation. Frontend mode is for exploration; the backend owns the canonical game state.

The planned event model (see below) makes this enforcement more explicit and complete.

---

## Shared Code: The Golden Rule [CURRENT]

> If logic runs on both frontend and backend, it must live in `/shared` and be the **exact same code** on both sides.

Movement processing is the primary example: `applyMove()` in `shared/src/movement.ts` is imported directly by both `GameView.tsx` (frontend) and the backend move API. There is no separate frontend version. This guarantees that a move that succeeds locally will succeed on the server and vice versa.

When adding new game logic, ask: "does this need to run on both sides?" If yes, put it in `/shared`. Resist the temptation to write two versions — divergence between frontend and backend logic is a bug waiting to happen.

---

## How the Routing Works in Practice [CURRENT]

In `App.tsx`, the mode is selected at startup and passed as a prop:

```tsx
<GameView mode="frontend" … />   // or mode="backend"
```

Inside `GameView.tsx`, the same component handles both modes. The key branch is in `handleMove`:

```ts
if (mode === 'frontend') {
  // Process locally using the shared applyMove()
  const result = applyMove(areaState, player, direction);
  setPlayer(…);
} else {
  // Send to backend; backend calls the same applyMove() server-side
  const result = await api.post('/area/move', { direction, … });
  setPlayer(…);
}
```

Backend mode also polls the server every few seconds to sync other players' positions — frontend mode skips this entirely since it's single-player.

---

## Map Definitions [CURRENT]

Maps are **fixed, static definitions** declared in `shared/src/maps/*.ts` — one file per area. They are not server-generated or seed-based. The backend maps area IDs to these definitions via `MAP_AREA_DEF_IDS`.

---

## Planned: Event Whitelist Model [PLANNED]

The goal is a more rigorous trust boundary for interactive actions (talking to NPCs, opening chests, entering buildings, starting encounters). The design:

1. **Client loads area:** `GET /api/town` returns a full snapshot — map grid, NPC list, interactables, and a **list of allowed event IDs** pre-approved by the server for this session.
2. **Client moves:** Movement is still simulated locally with no server call per step.
3. **Event is triggered:** Frontend sends `POST /api/town/event` with `event_id` and optional payload (e.g., player coordinates).
4. **Server validates:** Checks that the event exists, hasn't already been consumed, and that the player is in the correct location context. Then applies the change.
5. **Server responds:** Returns deltas or a new snapshot (updated NPC state, removed chest, new dialog state, quest flags, rewards).

If the frontend sends an event not in the allowed list, the server rejects it. This makes cheating structurally harder — the client cannot invent events the server didn't pre-authorize.

**Snapshot schema (from prototype):**
```
{ town_id, seed, width, height, tiles, npcs, events, allowed_event_ids, version }
```

**Validation rules (from prototype):**
- Unknown event ID → reject
- Already-consumed one-time event → reject
- Adjacency proof: client sends player coordinates; server validates against its own map copy
- Stale client: `version` field detects if client is working from an outdated snapshot → reject
- Events are idempotent for one-time interactions and side-effect-safe for repeatable dialog

**Open questions:**
- Return full snapshots or delta patches after each event?
- Should the client cache the snapshot with an ETag/version to prevent stale interactions?

---

## Planned: Server-Side Town Generation [PLANNED]

Currently maps are static files. The intended direction is for the server to **generate town snapshots from a seed**, storing the seed and event ledger rather than a fixed map. This allows:
- Towns to be rebuilt or revalidated server-side at any time
- The server to be the canonical source of town layout, not just player state

What the backend would own: generated town seed, immutable layout, NPC identities, active event list, event results, quest flags, and any rewards.

What the frontend would continue to own: transient state only — player position, camera, local animation.

---

## Summary [CURRENT]

| | Frontend mode | Backend mode |
|---|---|---|
| Move processing | Client-side (`applyMove` in browser) | Server-side (`applyMove` on backend) |
| Network per move | None (within an area) | Yes — one API call per move |
| Other players visible | No | Yes |
| Trusted for progression | No | Yes |
| Shared logic used | Same `applyMove` from `/shared` | Same `applyMove` from `/shared` |
| Map source | Static file in `/shared/src/maps/` | Same static file (server reads it) |
| Event validation | None — frontend runs free | Per-action API call |
