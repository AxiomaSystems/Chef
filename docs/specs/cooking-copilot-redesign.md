# Cooking Copilot Redesign

## Current Decision

Hands-free cooking is being repositioned from a recipe stepper into an ambient cooking copilot.

The user-facing concept is:

> Chef cooks with you, not just reads the recipe.

The recipe step remains available, but it is now a compact reference. The main surface is the agent state: listening, speaking, transcript, timer, and kitchen context.

## Implemented Slice

This slice keeps the existing voice architecture and changes the product experience:

- Fullscreen hands-free UI now presents as **Cook with Chef**.
- The center of the UI is an animated voice orb and live transcript.
- The current recipe step is a secondary reference card.
- A kitchen state panel shows phase, step timer, and progress.
- The UI exposes practical voice hints such as “repeat”, “next step”, and “pause timer”.
- Local Web Speech commands and ElevenLabs WebSocket behavior remain intact.

## Existing Architecture

Main component:

- `apps/web/src/components/hands-free-mode.tsx`

Entry points:

- Recipe detail page
- Recipe preparation page

Voice layers:

- Browser `SpeechRecognition` handles simple local commands.
- Browser `speechSynthesis` reads steps locally for low-latency step narration.
- ElevenLabs signed conversation WebSocket handles conversational audio.
- ElevenLabs client tool calls can trigger navigation and timer control.

Existing API route used by this mode:

- `POST /api/elevenlabs/token`

Routes that exist but are not currently used by the main hands-free component:

- `POST /api/stt`
- `POST /api/tts`

## Next Slices

1. Extract state and voice logic out of `hands-free-mode.tsx`.
2. Add real multi-timer commands like “start a pasta timer for 8 minutes”.
3. Send profile memory, inventory summary, appliances, and dietary rules into the cooking agent context.
4. Persist cooking session state and transcript if the product wants continuity across refresh/exit.
5. Upgrade transcript when ElevenLabs exposes partial user transcript events in this integration.
6. Add an explicit degraded local-only mode when ElevenLabs is unavailable.

## Non-Goals For This Slice

- No database changes.
- No camera or vision integration.
- No backend cooking-session persistence.
- No rewrite of the recipe preparation flow.
