# ElevenLabs Agent Config

This directory is the source of truth for the Preppie hands-free cooking copilot.

The dashboard can still be used for inspection, but prompt and tool changes
should be made here and synced with:

```powershell
pnpm elevenlabs:sync
```

Preview the payload without calling ElevenLabs:

```powershell
pnpm elevenlabs:diff
```

Required environment variables:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID` for updating an existing agent

If `ELEVENLABS_AGENT_ID` is missing, the sync script creates a new agent and
prints the new id. Add that id to root `.env` and to Vercel's web environment.

The React client expects these client tools to exist on the agent:

- `navigate_step`
- `timer_control`
- `adapt_current_step`
- `finish_cooking`
