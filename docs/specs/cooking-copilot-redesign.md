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
- Browser `SpeechRecognition` is used only as the local wake gate for "Chef" mode. Once the gate opens, ElevenLabs is the conversational voice path.
- The transcript and side panels are split out from the main hands-free controller to keep the audio/session logic easier to reason about.
- ElevenLabs transport, microphone capture, local wake gating, local TTS, and connection state now live in `useHandsFreeVoiceSession`.
- Hands-free conversational audio now uses the ElevenLabs client WebRTC session instead of the previous manual signed WebSocket + PCM16 forwarding path.
- The web app uses the current `@elevenlabs/react` package, which re-exports the supported ElevenLabs client APIs used by hands-free mode.
- The WebRTC session keeps the LiveKit microphone track published for connection stability; local activation modes are currently UI/conversation gates rather than SDK track mute toggles.
- If ElevenLabs closes an idle WebRTC conversation, the client requests a fresh token and reconnects automatically while staying in hands-free mode.
- The local wake detector asks the browser for echo cancellation, noise suppression, and automatic gain control when warming microphone permissions.
- ElevenLabs client tools are the source of truth for voice-driven navigation and timer control.
- Client tool calls update UI state silently and return tool results to ElevenLabs, so the agent speaks the confirmation instead of fighting local browser TTS.
- Agent response text strips ElevenLabs expressive tags such as `[laugh]` and `[happy]` before rendering transcript bubbles.
- Timer tools upsert active timers with the same label and derive a short label from the current cooking step when the agent/user omits one.
- Named timers remain visible, but the old per-step elapsed timer was removed because it made steps feel like the primary source of truth.
- Navigation tools support next/back/repeat and direct requests such as "go to step 3"; steps remain a reference for the agent, not the whole cooking state.
- The client can handle an `end_conversation` or `finish_cooking` client tool by closing Cooking Copilot.
- The agent prompt now treats recipe steps as an adaptable reference plan rather than an immutable source of truth.

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

- Browser `speechSynthesis` reads steps locally for low-latency step narration.
- ElevenLabs client WebRTC handles conversational audio.
- Browser `SpeechRecognition` handles only the local "Chef" wake gate when that mode is selected and supported by the browser.
- ElevenLabs client tool calls can trigger navigation and timer control.

Existing API route used by this mode:

- `POST /api/elevenlabs/token` returns a private ElevenLabs conversation token for WebRTC.

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
7. Add persisted cooking session state if the product needs post-cook summaries or resume support.

## Non-Goals For This Slice

- No database changes.
- No camera or vision integration.
- No backend cooking-session persistence.
- No rewrite of the recipe preparation flow.
