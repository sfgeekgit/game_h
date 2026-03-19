# Combat TODO List

## UI/UX Improvements

1. **Hero cycle hotkey** — Add a hotkey to cycle focus/selection between the player's heroes during combat. Not the Tab key — pick something else.

2. **Double move queue length** — Currently max 2 queued moves per unit; double it to 4.

3. **Move speed as player stat** — `MOVE_CHARGE_TIME` (currently hardcoded 3.0s in combatEngine.ts) should eventually be a per-player stat when the player stats system is built.

4. **Offset overlapping attack lines** — When 2 fighters attack each other, their orange targeting lines overlap completely. The lines should start off-center (offset perpendicular to the line direction) so both are visible.

5. **Health display rework** — Move the round HP status bar one row inside the circle. Remove the HP number text (e.g. "25/25") from inside the circle on the map — just show the ring bar. Use the outer ring (where health currently is) for spell/attack charge indicators like it was originally.

6. **Remove thick charge line** — Get rid of the thick progress line toward the target, but keep the thin targeting line that points at the target.

## Animation Improvements

7. **General animation polish** — All combat animations could be better.

8. **Animations should originate from attacker** — Currently animations look like they bonk the defender on the head from above. They should visually emerge from the attacker's position and travel toward the defender.
