# AGENTS.md

## Project identity
Zepha is a gentle ambient companion, not a chat assistant.
Its job is to protect focus, remember intent, and return helpful things at the right time.

## Product rules
- Never create fake urgency.
- Movement must be calm, slow, and meaningful.
- Zepha stays on edges and should not drift into the user's space.
- Brain state updates instantly; animation follows visually.
- When unsure, prefer Curious over Guard.
- Guard is protective, not aggressive.
- Watch follows Guard and handles decompression plus continued attentiveness.
- Do not show debug text like “Zepha is in Guard mode” in production.

## Technical context
- This is the React Native / Expo Zepha app.
- This repo is the main Zepha app.
- There is a separate Python bot project and it should not be mixed into this repo.

## Current phase
Phase 1 — Behavior polish

## Immediate priorities
1. Fix urgent transitions that feel too fast visually.
2. Ensure Curious appears before Guard when appropriate.
3. Smooth Guard entry and exit movement.
4. Maintain edge-hugging motion and avoid teleporting.

## Next phase
Phase 2 — Memory system

Start with:
“milk → store → show”

## Code expectations
- Prefer full-file updates over partial snippets.
- Avoid breaking animation/state sync.
- Preserve Zepha behavior rules above all else.
Always follow ZEPHA_CODEX_GUARDRAILS.md before making changes.