# NPC Dialogue Spec

## Overview

NPCs have deep dialogue trees inspired by Ultima IV. Players interact by typing keywords rather than selecting from multiple choice options. The challenge and discovery of finding the right words is core to the experience.

---

## NPC Data

### Database

NPC metadata lives in the database:

```
npcs(npc_id INT AUTO_INCREMENT PK, name VARCHAR(100), image VARCHAR(255), dialogue_file VARCHAR(255), created_at DATETIME)
```

- `name` — display name shown to player
- `image` — filename of sprite/portrait
- `dialogue_file` — path to YAML file in `/text_content/npcs/` (e.g., `blacksmith_dialogue.yml`)

### Dialogue Files

Dialogue content lives in `/text_content/npcs/` as YAML files. A writer can edit these without touching code.

---

## Dialogue Format

Most keywords map to simple text responses. Some keywords can have conditional logic or requirements.

### Simple Keywords (Most Common)

```yaml
npc_id: blacksmith_001
name: "Gareth the Blacksmith"

dialogue:
  name: "My name is Gareth."
  who: "I am the village blacksmith. Ask me about the SWORD."
  look: "A burly man with soot-stained hands and a leather apron. His eyes gleam with pride."
  sword: "I forged a silver sword for the king. Ask me about the DUNGEON."
  dungeon: "The dungeon lies to the north. You need a KEY."
  bye: "Fare thee well."
```

### Conditional Keywords

When branching or requirements are needed, a keyword can be an object:

```yaml
dialogue:
  sword: 
    default: "I make swords. Nothing special to say."
    if_quest_active: "Ah! You seek the Silver Sword? Ask me about the DUNGEON."
  
  dungeon:
    requires: sword  # Player must have asked about "sword" first
    text: "The dungeon lies to the north. You need a KEY."
```

Keep conditionals minimal — most keywords should stay as simple strings.

---

## Universal Keywords

Every NPC must respond to these keywords:

- **NAME** — tells you their name
- **WHO** — describes who they are, their role or purpose (the most important one — players will ask this of everyone)
- **LOOK** — describes what the player sees when they look at the NPC (appearance, demeanor, etc.)

---

## Common Keywords

These keywords are not required but are very common and recommended for most NPCs:

- **JOB** — describes their occupation or profession (more specific than WHO, which is broader)
- **NEWS** — local gossip, rumors, or what's happening in the area
- **BYE** — farewell response (optional)

---

## Ending Conversations

The **BYE** keyword always ends the conversation. The NPC can optionally provide a farewell response before the dialogue window closes, but this is not required. If no "bye" response is defined in the dialogue YAML, the conversation simply ends without additional text.

---

## Player Interaction

### Desktop
- Player faces NPC and presses spacebar or clicks NPC
- Dialogue window opens
- Player types keywords and presses enter
- NPC responds with text from the YAML

### Mobile
- Player taps NPC
- Dialogue window opens with text input
- Mobile keyboard appears (including voice-to-text option via OS)
- Player types keyword and submits
- NPC responds

Keywords should be short (1-2 words) to minimize typing friction on mobile.

---

## Keyword Discovery

NPCs hint at keywords in their responses using CAPS or some other visual indicator:

> "I am the village blacksmith. Ask me about the SWORD."

Players learn to look for these hints and try typing them.

---

## Unknown Keywords

When a player types a keyword the NPC doesn't recognize, the system responds with a random fallback message.

### Generic Fallbacks

A file at `/text_content/dialogue_fallbacks.yml` contains generic "I don't know" responses:

```yaml
generic_fallbacks:
  - "I know not of such things."
  - "I cannot help thee with that."
  - "Thou dost speak of matters unknown to me."
  - "I have naught to say on that subject."
  - "Perhaps another can aid thee with that."
```

The code picks one at random when an unknown keyword is typed.

### NPC-Specific Fallbacks (Optional)

Any NPC can override the generic fallbacks with their own list:

```yaml
npc_id: blacksmith_001
name: "Gareth the Blacksmith"

fallbacks:  # Optional - overrides generic
  - "That's not my trade, friend."
  - "Ask me about smithing, not nonsense."
  - "I work with metal, not riddles."

dialogue:
  name: "My name is Gareth."
  who: "I am the village blacksmith."
  # ...
```

If the NPC has custom fallbacks, use those. Otherwise, use the generic ones.

---

## Conversation State

For the prototype: NPCs do not remember past conversations. Every interaction starts fresh. Future iterations may track which keywords a player has asked to enable more complex branching.

---

## Frontend vs Backend Areas

- **Frontend areas** — all NPC dialogue YAML files for that area are loaded when the area first loads. Dialogue is read-only and does not require mutex locking.
- **Backend areas** — dialogue files are loaded on the backend as needed when a player interacts with an NPC.

See `gameplay_prototype_spec.md` for more details on area loading.

---

## Out of Scope (For Now)

- Dynamic LLM-generated responses
- Quest flags and complex state tracking
- NPC memory of past conversations
- Trading/shops (separate system)
