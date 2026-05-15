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
- A kitchen state panel shows phase, step timer, named timers, and progress.
- The UI exposes practical voice hints such as "repeat", "next step", and "pause timer".
- Named countdown timers can be started, paused, resumed, stopped, and queried with voice-style commands.
- Active timers appear in the kitchen state panel so parallel cooking tasks are visible.
- Cooking Copilot now receives a compact user cooking context: profile memory, dietary rules, goals, kitchen defaults, pantry staples, and active inventory.
- The UI shows a small **Chef knows** panel so users can see when personalization context is loaded.
- The transcript now separates what Chef heard from the action it executed, making voice command failures easier to debug.
- Agent responses are no longer parsed as local voice commands.
- Browser `SpeechRecognition` is no longer run in parallel with ElevenLabs. ElevenLabs is the only voice input path during normal hands-free mode to avoid duplicate transcripts and phantom commands.
- The transcript and side panels are split out from the main hands-free controller to keep the audio/session logic easier to reason about.
- ElevenLabs transport, microphone capture, PCM playback, local TTS, and connection state now live in `useHandsFreeVoiceSession`.
- Local Web Speech commands and ElevenLabs WebSocket behavior remain intact.

## Existing Architecture

Main component:

- `apps/web/src/components/hands-free-mode.tsx`
- `apps/web/src/components/use-hands-free-voice-session.ts`
- `apps/web/src/components/hands-free-mode-panels.tsx`
- `apps/web/src/components/hands-free-mode-types.ts`

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
2. Persist cooking session state and transcript if the product wants continuity across refresh/exit.
3. Upgrade transcript when ElevenLabs exposes partial user transcript events in this integration.
4. Add an explicit degraded local-only mode when ElevenLabs is unavailable.
5. Split the component into smaller state, voice, transcript, and UI modules.
6. Move context assembly server-side into a dedicated cooking-session endpoint if this grows.

## Non-Goals For This Slice

- No database changes.
- No camera or vision integration.
- No backend cooking-session persistence.
- No rewrite of the recipe preparation flow.
