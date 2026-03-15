# Gameplay Design — Town Exploration

Inspiration: **Ultima IV**. Top-down grid, cozy and readable, big fantasy town.

---

## Core Feel

- Discrete tile-to-tile movement — no smooth scrolling. Keeps the U4 feel.
- WASD / arrow key movement. No backend calls per step.
- **Talking is a deliberate action.** You press a talk key when you want to converse — it does not auto-trigger when you walk near an NPC. This is intentional; the deliberate "talk" command is part of the vibe.

---

## Movement & Interaction

- Frontend handles all movement and collision checks. Backend only sees explicit events.
- You move to position near someone, then trigger a talk action.
- Event calls (talk, use, interact) are sent to the backend only when you deliberately trigger them.

---

## NPCs & Dialog

- Many NPCs; dialog is detailed and branching.
- Simple, memorable keywords drive conversations.
- Conversations can reveal keywords or prompts that unlock new dialog elsewhere in town.
- NPCs can send you across town — to fetch objects or talk to other specific NPCs.

---

## Town Layout

- Large town with multiple districts to encourage wandering.
- Landmarks and unique buildings to make navigation memorable without a map.
- NPC placement supports short errands and cross-town fetch tasks.
- Fetch quests are short and readable — designed for quick in-town loops, not long grinds.

---

## Quest & Dialog Flow

- Branching dialog with keywords.
- Some NPCs provide directions to other NPCs or locations.
- Short fetch chains: NPC A sends you to location B, you return to NPC A, unlock NPC C, etc.
- Dialog state persists per player (what you've said, what quests are active).

---

## What This Means for Code

- **No auto-talk on proximity** — the talk action must be an explicit player input, not triggered by walking adjacent.
- **All dialog text lives in `text_content/`** — never hardcoded in components or backend logic. Writers edit text files; they don't touch code.
- **Keywords are the dialog API** — the player types or selects a keyword; the system resolves it against the NPC's dialog tree. See `shared/src/dialogue.ts`.
- **Quest state is backend-owned** — flags, item grants, and dialog progression are stored server-side and validated per event.
