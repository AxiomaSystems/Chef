"use client";

import { useEffect, useRef, useState } from "react";
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

function getStepIngredients(stepText: string, ingredients: BaseRecipe["ingredients"]) {
  const lower = stepText.toLowerCase();
  return ingredients.filter((ing) => {
    const name = (ing.display_ingredient ?? ing.canonical_ingredient).toLowerCase();
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
  ping_event?: { event_id?: string };
  client_tool_call?: ElevenLabsToolCall;
};

function getAudioPayload(msg: ElevenLabsMessage) {
  return msg.audio_event?.audio_base64 ?? msg.audio_event?.audio_base_64 ?? null;
}

function sendWsMessage(ws: WebSocket | null, payload: unknown) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function HandsFreeMode({ recipe, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mode, setMode] = useState<Mode>("connecting");
  const [agentMessage, setAgentMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const activeStepRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scheduledUntilRef = useRef(0); // for gapless audio scheduling

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
    const id = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

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

      const startAt = Math.max(ctx.currentTime, scheduledUntilRef.current);
      src.start(startAt);
      scheduledUntilRef.current = startAt + buf.duration;

      if (mounted) setMode("speaking");
      src.onended = () => {
        if (mounted && ctx.currentTime >= scheduledUntilRef.current - 0.05) {
          setMode("listening");
        }
      };
    }

    function handleToolCall(name: string, params: Record<string, unknown>, id: string) {
      const ws = wsRef.current;
      if (!ws) return;

      if (name !== "navigate_step") {
        sendWsMessage(ws, {
          type: "client_tool_result",
          tool_call_id: id,
          result: `Unsupported client tool: ${name}`,
          is_error: true,
        });
        return;
      }

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

      activeStepRef.current = idx;
      setActiveStep(idx);
      setElapsedSeconds(0);

      const step = recipe.steps[idx];
      const result = step
        ? `Step ${idx + 1} of ${recipe.steps.length}: ${step.what_to_do}`
        : dir === "next"
          ? "That's the last step - you're done!"
          : "Already at the first step.";

      sendWsMessage(ws, {
        type: "client_tool_result",
        tool_call_id: id,
        result: step ? `${result}\nRead this step aloud now.` : result,
        is_error: false,
      });
    }

    async function connect() {
      try {
        setConnectionError(null);

        const tokenRes = await fetch("/api/elevenlabs/token", { method: "POST" });
        const tokenData = (await tokenRes.json().catch(() => null)) as SignedUrlResponse | null;
        if (!tokenRes.ok || !tokenData?.signed_url) {
          throw new Error(tokenData?.error ?? "Unable to start ElevenLabs conversation.");
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Microphone access is not available in this browser.");
        }

        const ctx = new AudioContext({ latencyHint: "interactive" });
        audioCtxRef.current = ctx;
        if (ctx.state === "suspended") void ctx.resume();
        const nativeRate = ctx.sampleRate;

        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        const ws = new WebSocket(tokenData.signed_url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mounted) return;

          const stepsText = recipe.steps.map((s) => `Step ${s.step}: ${s.what_to_do}`).join("\n");
          sendWsMessage(ws, {
            type: "conversation_initiation_client_data",
            dynamic_variables: {
              recipe_name: recipe.name,
              servings: String(recipe.servings),
              steps: stepsText,
            },
          });

          sourceNode = ctx.createMediaStreamSource(stream!);
          processor = ctx.createScriptProcessor(MIC_CHUNK_SIZE, 1, 1);
          silentGain = ctx.createGain();
          silentGain.gain.value = 0;

          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            const chunk = encodeAudioChunk(e.inputBuffer.getChannelData(0), nativeRate);
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
                  setAgentMessage(msg.agent_response_event.agent_response);
                  window.setTimeout(() => setAgentMessage(null), 5000);
                }
                break;
              case "interruption":
                scheduledUntilRef.current = ctx.currentTime;
                setMode("listening");
                break;
              case "ping":
                if (msg.ping_event?.event_id) {
                  window.setTimeout(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                      sendWsMessage(ws, { type: "pong", event_id: msg.ping_event?.event_id });
                    }
                  }, msg.ping_event.ping_ms ?? 0);
                }
                break;
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
              error instanceof Error ? error.message : "Failed to handle ElevenLabs message.",
            );
          }
        };

        ws.onclose = (event) => {
          if (!mounted) return;
          setMode("disconnected");
          if (!event.wasClean) {
            setConnectionError(
              event.reason || `ElevenLabs connection closed unexpectedly (${event.code}).`,
            );
          }
        };

        ws.onerror = () => {
          if (!mounted) return;
          setMode("disconnected");
          setConnectionError("ElevenLabs connection failed. Check the agent and API key settings.");
        };
      } catch (error) {
        if (!mounted) return;
        setMode("disconnected");
        setConnectionError(error instanceof Error ? error.message : "Hands-free mode failed to start.");
      }
    }

    void connect();

    return () => {
      mounted = false;
      wsRef.current?.close();
      wsRef.current = null;
      processor?.disconnect();
      sourceNode?.disconnect();
      silentGain?.disconnect();
      stream?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close();
      audioCtxRef.current = null;
    };
  }, [recipe.ingredients, recipe.name, recipe.servings, recipe.steps]);

  function manualNav(dir: "next" | "prev") {
    const idx =
      dir === "next"
        ? Math.min(recipe.steps.length - 1, activeStep + 1)
        : Math.max(0, activeStep - 1);
    activeStepRef.current = idx;
    setActiveStep(idx);
    setElapsedSeconds(0);
    sendWsMessage(wsRef.current, {
      type: "user_message",
      text: `I tapped the ${dir === "next" ? "next" : "back"} button. Read step ${idx + 1} aloud now: ${recipe.steps[idx]?.what_to_do ?? ""}`,
    });
  }

  const modeConfig: Record<Mode, { label: string; icon: string; ring: string }> = {
    connecting: { label: "Connecting...", icon: "mic", ring: "bg-white/10 text-white/30" },
    listening: {
      label: "Listening...",
      icon: "mic",
      ring: "animate-pulse bg-amber-400/20 text-amber-400",
    },
    speaking: { label: "Speaking...", icon: "volume_up", ring: "bg-amber-400/30 text-amber-300" },
    disconnected: { label: "Disconnected", icon: "mic_off", ring: "bg-red-500/20 text-red-400" },
  };
  const { label, icon, ring } = modeConfig[mode];

  return (
    <div className="fixed inset-0 z-80 flex flex-col bg-[#0f0a05] text-white">
      <div className="flex items-center justify-between px-6 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400/70">
            Hands-free
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/60">
            Step {activeStep + 1} of {recipe.steps.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/10 px-5 py-2 text-center">
            <p className="font-mono text-2xl font-semibold tabular-nums text-amber-300">
              {formatTime(elapsedSeconds)}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-white/40">This step</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Exit hands-free mode"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </div>

      <div className="h-0.5 bg-white/10">
        <div
          className="h-full bg-amber-400/60 transition-all duration-300"
          style={{ width: `${((activeStep + 1) / recipe.steps.length) * 100}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 py-10 text-center">
        <p className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
          {title}
        </p>
        {body ? <p className="max-w-2xl text-xl leading-8 text-white/60">{body}</p> : null}
        {stepIngredients.length > 0 ? (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {stepIngredients.map((ing, i) => (
              <span
                key={i}
                className="rounded-full bg-amber-400/15 px-4 py-1.5 text-sm text-amber-200/80"
              >
                {ing.amount} {ing.unit} {ing.display_ingredient ?? ing.canonical_ingredient}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {agentMessage ? (
        <div className="pointer-events-none absolute left-1/2 top-24 max-w-sm -translate-x-1/2 rounded-2xl bg-white/10 px-6 py-3 text-center text-sm text-white/70 backdrop-blur-sm">
          {agentMessage}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4 px-8 pb-10 pt-4">
        <button
          type="button"
          onClick={() => manualNav("prev")}
          disabled={activeStep === 0}
          aria-label="Previous step"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-[28px]">arrow_back</span>
        </button>

        <div className="flex flex-col items-center gap-2">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${ring}`}>
            <span className="material-symbols-outlined text-[28px]">{icon}</span>
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
          className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20 text-amber-300 transition-colors hover:bg-amber-400/30 disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-[28px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
