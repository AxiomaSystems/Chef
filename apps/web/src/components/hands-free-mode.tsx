"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BaseRecipe } from "@cart/shared";

const TARGET_SAMPLE_RATE = 16000; // ElevenLabs expects 16 kHz PCM16 input
const MIC_CHUNK_SIZE = 2048;

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function splitTitle(text: string) {
  const parts = text.split(/(?<=[.!?])\s+/);
  return { title: parts[0] ?? text, body: parts.slice(1).join(" ") };
}

function getStepIngredients(
  stepText: string,
  ingredients: BaseRecipe["ingredients"],
) {
  const lower = stepText.toLowerCase();
  return ingredients.filter((ing) => {
    const name = (
      ing.display_ingredient ?? ing.canonical_ingredient
    ).toLowerCase();
    return name.split(" ").some((w) => w.length > 3 && lower.includes(w));
  });
}

// Downsample Float32 from browser native rate to 16 kHz, then encode as base64 PCM16.
function encodeAudioChunk(float32: Float32Array, fromRate: number): string {
  const ratio = fromRate / TARGET_SAMPLE_RATE;
  const outLen = Math.floor(float32.length / ratio);
  const pcm16 = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const s = Math.max(-1, Math.min(1, float32[Math.floor(i * ratio)]));
    pcm16[i] = s < 0 ? s * 32768 : s * 32767;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// Decode base64 PCM16 to a Float32 playable buffer. Handles base64url from ElevenLabs.
function decodePcm16Base64(b64: string): Float32Array {
  const standard = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = standard + "=".repeat((4 - (standard.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const pcm16 = new Int16Array(bytes.buffer);
  const f32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) f32[i] = pcm16[i] / 32768;
  return f32;
}

type Mode = "connecting" | "listening" | "speaking" | "disconnected";
type Props = { recipe: BaseRecipe; onClose: () => void };
type TimerCommand = "pause" | "resume" | "toggle";
type SignedUrlResponse = { signed_url?: string; error?: string };
type ElevenLabsToolCall = {
  tool_name?: string;
  parameters?: Record<string, unknown>;
  tool_call_id?: string;
};
type ElevenLabsMessage = {
  type?: string;
  audio_event?: { audio_base64?: string; audio_base_64?: string };
  agent_response_event?: { agent_response?: string };
  ping_event?: { event_id?: string; ping_ms?: number };
  client_tool_call?: ElevenLabsToolCall;
};

function getAudioPayload(msg: ElevenLabsMessage) {
  return (
    msg.audio_event?.audio_base64 ?? msg.audio_event?.audio_base_64 ?? null
  );
}

function sendWsMessage(ws: WebSocket | null, payload: unknown) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function HandsFreeMode({ recipe, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [mode, setMode] = useState<Mode>("connecting");
  const [agentMessage, setAgentMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const activeStepRef = useRef(0);
  const timerPausedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scheduledUntilRef = useRef(0); // for gapless audio scheduling
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const currentStep = recipe.steps[activeStep] ?? null;
  const { title, body } = currentStep
    ? splitTitle(currentStep.what_to_do)
    : { title: "No steps.", body: "" };
  const stepIngredients = currentStep
    ? getStepIngredients(currentStep.what_to_do, recipe.ingredients)
    : [];

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  useEffect(() => {
    timerPausedRef.current = isTimerPaused;
  }, [isTimerPaused]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!timerPausedRef.current) {
        setElapsedSeconds((s) => s + 1);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  function stopQueuedSpeech() {
    const ctx = audioCtxRef.current;
    for (const source of audioSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // The source may have already ended.
      }
      source.disconnect();
    }
    audioSourcesRef.current.clear();
    scheduledUntilRef.current = ctx?.currentTime ?? 0;
    setMode((current) => (current === "disconnected" ? current : "listening"));
  }

  const setTimerPaused = useCallback((nextPaused: boolean) => {
    timerPausedRef.current = nextPaused;
    setIsTimerPaused(nextPaused);
  }, []);

  const controlTimer = useCallback(
    (command: TimerCommand) => {
      const nextPaused =
        command === "toggle" ? !timerPausedRef.current : command === "pause";
      setTimerPaused(nextPaused);
    },
    [setTimerPaused],
  );

  const goToStep = useCallback(
    (idx: number) => {
      const boundedIdx = Math.max(0, Math.min(recipe.steps.length - 1, idx));
      activeStepRef.current = boundedIdx;
      setActiveStep(boundedIdx);
      setElapsedSeconds(0);
      setTimerPaused(false);
    },
    [recipe.steps.length, setTimerPaused],
  );

  useEffect(() => {
    let mounted = true;
    let stream: MediaStream | null = null;
    let processor: ScriptProcessorNode | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let silentGain: GainNode | null = null;

    function playChunk(b64: string) {
      const ctx = audioCtxRef.current;
      if (!ctx || !mounted) return;

      if (ctx.state === "suspended") void ctx.resume();

      const f32 = decodePcm16Base64(b64);
      const buf = ctx.createBuffer(1, f32.length, TARGET_SAMPLE_RATE);
      buf.getChannelData(0).set(f32);

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      audioSourcesRef.current.add(src);

      const startAt = Math.max(ctx.currentTime, scheduledUntilRef.current);
      src.start(startAt);
      scheduledUntilRef.current = startAt + buf.duration;

      if (mounted) setMode("speaking");
      src.onended = () => {
        audioSourcesRef.current.delete(src);
        src.disconnect();
        if (mounted && ctx.currentTime >= scheduledUntilRef.current - 0.05) {
          setMode("listening");
        }
      };
    }

    function handleToolCall(
      name: string,
      params: Record<string, unknown>,
      id: string,
    ) {
      const ws = wsRef.current;
      if (!ws) return;

      if (name === "timer_control" || name === "control_timer") {
        const action = String(params.action ?? params.command ?? "");
        if (action === "pause" || action === "resume" || action === "toggle") {
          controlTimer(action);
          sendWsMessage(ws, {
            type: "client_tool_result",
            tool_call_id: id,
            result:
              action === "pause"
                ? "Timer paused."
                : action === "resume"
                  ? "Timer resumed."
                  : timerPausedRef.current
                    ? "Timer paused."
                    : "Timer resumed.",
            is_error: false,
          });
          return;
        }

        sendWsMessage(ws, {
          type: "client_tool_result",
          tool_call_id: id,
          result: `Unsupported timer action: ${action}`,
          is_error: true,
        });
        return;
      }

      if (name !== "navigate_step") {
        sendWsMessage(ws, {
          type: "client_tool_result",
          tool_call_id: id,
          result: `Unsupported client tool: ${name}`,
          is_error: true,
        });
        return;
      }

      stopQueuedSpeech();

      let idx = activeStepRef.current;
      const dir = params.direction;
      if (dir === "next") idx = Math.min(recipe.steps.length - 1, idx + 1);
      else if (dir === "previous" || dir === "back") idx = Math.max(0, idx - 1);
      else if (dir !== "repeat") {
        sendWsMessage(ws, {
          type: "client_tool_result",
          tool_call_id: id,
          result: `Unsupported navigation direction: ${String(dir)}`,
          is_error: true,
        });
        return;
      }

      const step = recipe.steps[idx];
      const result = step
        ? `Step ${idx + 1} of ${recipe.steps.length}: ${step.what_to_do}`
        : dir === "next"
          ? "That's the last step - you're done!"
          : "Already at the first step.";

      sendWsMessage(ws, {
        type: "client_tool_result",
        tool_call_id: id,
        result,
        is_error: false,
      });

      if (step) {
        goToStep(idx);
      }
    }

    async function connect() {
      try {
        setConnectionError(null);

        const tokenRes = await fetch("/api/elevenlabs/token", {
          method: "POST",
        });
        const tokenData = (await tokenRes
          .json()
          .catch(() => null)) as SignedUrlResponse | null;
        if (!tokenRes.ok || !tokenData?.signed_url) {
          throw new Error(
            tokenData?.error ?? "Unable to start ElevenLabs conversation.",
          );
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Microphone access is not available in this browser.",
          );
        }

        const ctx = new AudioContext({ latencyHint: "interactive" });
        audioCtxRef.current = ctx;
        if (ctx.state === "suspended") void ctx.resume();
        const nativeRate = ctx.sampleRate;

        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        const ws = new WebSocket(tokenData.signed_url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mounted) return;

          const stepsText = recipe.steps
            .map((s) => `Step ${s.step}: ${s.what_to_do}`)
            .join("\n");
          sendWsMessage(ws, {
            type: "conversation_initiation_client_data",
            dynamic_variables: {
              recipe_name: recipe.name,
              servings: String(recipe.servings),
              steps: stepsText,
              hands_free_client_rules:
                "Keep responses under 2 short sentences. For next, back, previous, repeat, pause timer, or resume timer, call the client tool instead of explaining. Use the client tool result to confirm timer changes or read the active recipe step aloud.",
            },
          });

          sourceNode = ctx.createMediaStreamSource(stream!);
          processor = ctx.createScriptProcessor(MIC_CHUNK_SIZE, 1, 1);
          silentGain = ctx.createGain();
          silentGain.gain.value = 0;

          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            const chunk = encodeAudioChunk(
              e.inputBuffer.getChannelData(0),
              nativeRate,
            );
            sendWsMessage(ws, { user_audio_chunk: chunk });
          };

          sourceNode.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(ctx.destination);

          if (mounted) setMode("listening");
        };

        ws.onmessage = (ev) => {
          if (!mounted) return;
          let msg: ElevenLabsMessage;
          try {
            msg = JSON.parse(ev.data as string) as ElevenLabsMessage;
          } catch {
            return;
          }

          try {
            switch (msg.type) {
              case "audio":
                {
                  const audioBase64 = getAudioPayload(msg);
                  if (audioBase64) playChunk(audioBase64);
                }
                break;
              case "agent_response":
                if (msg.agent_response_event?.agent_response) {
                  const responseText = msg.agent_response_event.agent_response;
                  setAgentMessage(responseText);
                  window.setTimeout(() => setAgentMessage(null), 5000);
                }
                break;
              case "interruption":
                stopQueuedSpeech();
                break;
              case "ping": {
                const pingEvent = msg.ping_event;
                if (!pingEvent?.event_id) break;

                const delayMs = pingEvent.ping_ms ?? 0;

                window.setTimeout(() => {
                  if (ws.readyState === WebSocket.OPEN) {
                    sendWsMessage(ws, {
                      type: "pong",
                      event_id: pingEvent.event_id,
                    });
                  }
                }, delayMs);

                break;
              }
              case "client_tool_call":
                if (
                  msg.client_tool_call?.tool_name &&
                  msg.client_tool_call.parameters &&
                  msg.client_tool_call.tool_call_id
                ) {
                  handleToolCall(
                    msg.client_tool_call.tool_name,
                    msg.client_tool_call.parameters,
                    msg.client_tool_call.tool_call_id,
                  );
                }
                break;
            }
          } catch (error) {
            setConnectionError(
              error instanceof Error
                ? error.message
                : "Failed to handle ElevenLabs message.",
            );
          }
        };

        ws.onclose = (event) => {
          if (!mounted) return;
          setMode("disconnected");
          if (!event.wasClean) {
            setConnectionError(
              event.reason ||
                `ElevenLabs connection closed unexpectedly (${event.code}).`,
            );
          }
        };

        ws.onerror = () => {
          if (!mounted) return;
          setMode("disconnected");
          setConnectionError(
            "ElevenLabs connection failed. Check the agent and API key settings.",
          );
        };
      } catch (error) {
        if (!mounted) return;
        setMode("disconnected");
        setConnectionError(
          error instanceof Error
            ? error.message
            : "Hands-free mode failed to start.",
        );
      }
    }

    void connect();

    return () => {
      mounted = false;
      wsRef.current?.close();
      wsRef.current = null;
      stopQueuedSpeech();
      processor?.disconnect();
      sourceNode?.disconnect();
      silentGain?.disconnect();
      stream?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close();
      audioCtxRef.current = null;
    };
  }, [
    controlTimer,
    goToStep,
    recipe.ingredients,
    recipe.name,
    recipe.servings,
    recipe.steps,
  ]);

  function manualNav(dir: "next" | "prev") {
    const idx =
      dir === "next"
        ? Math.min(recipe.steps.length - 1, activeStep + 1)
        : Math.max(0, activeStep - 1);
    goToStep(idx);
  }

  const modeConfig: Record<
    Mode,
    { label: string; icon: string; ring: string }
  > = {
    connecting: {
      label: "Connecting...",
      icon: "mic",
      ring: "bg-white/10 text-white/30",
    },
    listening: {
      label: "Listening...",
      icon: "mic",
      ring: "animate-pulse bg-amber-400/20 text-amber-400",
    },
    speaking: {
      label: "Speaking...",
      icon: "volume_up",
      ring: "bg-amber-400/30 text-amber-300",
    },
    disconnected: {
      label: "Disconnected",
      icon: "mic_off",
      ring: "bg-red-500/20 text-red-400",
    },
  };
  const { label, icon, ring } = modeConfig[mode];

  return (
    <div className="fixed inset-0 z-80 flex flex-col overflow-hidden bg-[#132326] text-white">
      <video
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/videos/axioma-blobs.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(10,18,20,0.58),rgba(10,18,20,0.78)_48%,rgba(10,18,20,0.9))]" />

      <div className="relative z-10 flex items-start justify-between gap-3 px-4 pb-3 pt-4 sm:items-center sm:px-6 sm:pb-4 sm:pt-6">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400/70">
            Hands-free
          </span>
          <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 backdrop-blur-md sm:text-sm">
            Step {activeStep + 1} of {recipe.steps.length}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => controlTimer("toggle")}
            aria-label={isTimerPaused ? "Resume timer" : "Pause timer"}
            className={`flex items-center gap-2 rounded-3xl border px-3 py-2 text-left backdrop-blur-md transition-colors sm:gap-4 sm:px-5 sm:py-3 ${
              isTimerPaused
                ? "border-amber-300/50 bg-amber-300/15"
                : "border-white/10 bg-white/10 hover:bg-white/15"
            }`}
          >
            <span className="material-symbols-outlined text-[22px] text-amber-300 sm:text-[28px]">
              {isTimerPaused ? "play_arrow" : "pause"}
            </span>
            <span>
              <span className="block font-mono text-2xl font-black leading-none tabular-nums text-amber-300 sm:text-4xl">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="mt-1 hidden text-[10px] font-bold uppercase tracking-widest text-white/50 sm:block">
                {isTimerPaused ? "Paused" : "This step"}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit hands-free mode"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-md hover:bg-white/20 hover:text-white"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </div>

      <div className="relative z-10 h-0.5 bg-white/10">
        <div
          className="h-full bg-amber-400/60 transition-all duration-300"
          style={{
            width: `${((activeStep + 1) / recipe.steps.length) * 100}%`,
          }}
        />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-8 text-center sm:px-8 sm:py-10">
        <p className="mb-4 max-w-4xl text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)] sm:mb-6 sm:text-6xl">
          {title}
        </p>
        {body ? (
          <p className="max-w-2xl text-base leading-7 text-white/70 drop-shadow-[0_2px_16px_rgba(0,0,0,0.35)] sm:text-xl sm:leading-8">
            {body}
          </p>
        ) : null}
        {stepIngredients.length > 0 ? (
          <div className="mt-6 flex max-w-3xl flex-wrap justify-center gap-2 sm:mt-8">
            {stepIngredients.map((ing, i) => (
              <span
                key={i}
                className="rounded-full bg-amber-400/15 px-3 py-1.5 text-xs text-amber-100/90 backdrop-blur-md sm:px-4 sm:text-sm"
              >
                {ing.amount} {ing.unit}{" "}
                {ing.display_ingredient ?? ing.canonical_ingredient}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {agentMessage ? (
        <div className="pointer-events-none absolute left-1/2 top-24 z-20 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl bg-white/10 px-5 py-3 text-center text-sm text-white/80 backdrop-blur-md sm:max-w-sm sm:px-6">
          {agentMessage}
        </div>
      ) : null}

      <div className="relative z-10 flex items-center justify-between gap-4 px-5 pb-6 pt-4 sm:px-8 sm:pb-10">
        <button
          type="button"
          onClick={() => manualNav("prev")}
          disabled={activeStep === 0}
          aria-label="Previous step"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 disabled:opacity-30 sm:h-16 sm:w-16"
        >
          <span className="material-symbols-outlined text-[26px] sm:text-[28px]">
            arrow_back
          </span>
        </button>

        <div className="flex flex-col items-center gap-2">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${ring}`}
          >
            <span className="material-symbols-outlined text-[28px]">
              {icon}
            </span>
          </div>
          <p className="text-[11px] text-white/40">{label}</p>
          {connectionError ? (
            <p className="max-w-xs text-center text-xs leading-5 text-red-300/80">
              {connectionError}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => manualNav("next")}
          disabled={activeStep >= recipe.steps.length - 1}
          aria-label="Next step"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/20 text-amber-300 backdrop-blur-md transition-colors hover:bg-amber-400/30 disabled:opacity-30 sm:h-16 sm:w-16"
        >
          <span className="material-symbols-outlined text-[26px] sm:text-[28px]">
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}
