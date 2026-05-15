"use client";

import { useEffect, useRef, useState } from "react";
import type { BaseRecipe } from "@cart/shared";
import type { CookingContext } from "@/lib/cooking-context";
import { stringifyCookingContext } from "@/lib/cooking-context";
import type { HandsFreeModeStatus } from "./hands-free-mode-types";

const TARGET_SAMPLE_RATE = 16000; // ElevenLabs expects 16 kHz PCM16 input
const MIC_CHUNK_SIZE = 2048;

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
  user_transcript_event?: { user_transcript?: string; transcript?: string };
  user_transcription_event?: { user_transcript?: string; transcript?: string };
  ping_event?: { event_id?: string; ping_ms?: number };
  client_tool_call?: ElevenLabsToolCall;
};
type ToolResult = {
  result: string;
  isError?: boolean;
};
type ClientToolContext = {
  sendToolResult: (id: string, result: ToolResult) => void;
  stopQueuedSpeech: () => void;
};
type ClientToolHandler = (
  name: string,
  params: Record<string, unknown>,
  id: string,
  context: ClientToolContext,
) => void;

type UseHandsFreeVoiceSessionOptions = {
  cookingContext?: CookingContext;
  onAgentResponse: (text: string) => void;
  onClientToolCall: ClientToolHandler;
  onUserTranscript?: (text: string) => void;
  recipe: BaseRecipe;
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

function cleanAgentText(text: string) {
  return text
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stringifyRecipeIngredients(ingredients: BaseRecipe["ingredients"]) {
  if (ingredients.length === 0) return "No structured ingredients available.";

  return ingredients
    .slice(0, 60)
    .map((ingredient) => {
      const parts = [
        ingredient.amount,
        ingredient.unit,
        ingredient.display_ingredient ?? ingredient.canonical_ingredient,
      ]
        .filter((part) => part !== null && part !== undefined && part !== "")
        .map(String);

      return `- ${parts.join(" ")}`;
    })
    .join("\n");
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

export function useHandsFreeVoiceSession({
  cookingContext,
  onAgentResponse,
  onClientToolCall,
  onUserTranscript,
  recipe,
}: UseHandsFreeVoiceSessionOptions) {
  const [mode, setMode] = useState<HandsFreeModeStatus>("connecting");
  const [agentMessage, setAgentMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const agentSpeakingRef = useRef(false);
  const localSpeechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onAgentResponseRef = useRef(onAgentResponse);
  const onClientToolCallRef = useRef(onClientToolCall);
  const onUserTranscriptRef = useRef(onUserTranscript);
  const scheduledUntilRef = useRef(0); // for gapless audio scheduling
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    onAgentResponseRef.current = onAgentResponse;
  }, [onAgentResponse]);

  useEffect(() => {
    onClientToolCallRef.current = onClientToolCall;
  }, [onClientToolCall]);

  useEffect(() => {
    onUserTranscriptRef.current = onUserTranscript;
  }, [onUserTranscript]);

  function sendToolResult(id: string, { result, isError = false }: ToolResult) {
    sendWsMessage(wsRef.current, {
      type: "client_tool_result",
      tool_call_id: id,
      result,
      is_error: isError,
    });
  }

  function stopQueuedSpeech() {
    agentSpeakingRef.current = false;
    window.speechSynthesis?.cancel();
    localSpeechUtteranceRef.current = null;
    const ctx = audioCtxRef.current;
    agentSpeakingRef.current = true;
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

  function speakLocal(text: string) {
    if (!("speechSynthesis" in window)) return;

    stopQueuedSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    localSpeechUtteranceRef.current = utterance;
    setMode("speaking");
    utterance.onend = () => {
      if (localSpeechUtteranceRef.current === utterance) {
        localSpeechUtteranceRef.current = null;
        agentSpeakingRef.current = false;
        setMode((current) =>
          current === "disconnected" ? current : "listening",
        );
      }
    };
    utterance.onerror = utterance.onend;
    window.speechSynthesis.speak(utterance);
  }

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
      agentSpeakingRef.current = true;

      const startAt = Math.max(ctx.currentTime, scheduledUntilRef.current);
      src.start(startAt);
      scheduledUntilRef.current = startAt + buf.duration;

      if (mounted) setMode("speaking");
      src.onended = () => {
        audioSourcesRef.current.delete(src);
        src.disconnect();
        if (mounted && ctx.currentTime >= scheduledUntilRef.current - 0.05) {
          agentSpeakingRef.current = false;
          setMode("listening");
        }
      };
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
          const ingredientsText = stringifyRecipeIngredients(
            recipe.ingredients,
          );
          const cookingPlan =
            "The recipe steps are a reference plan, not a rigid script. If the user says something went wrong, something burned, an ingredient is missing, timing changed, or they want to improvise, adapt the plan conversationally using recipe context, profile memory, and inventory. Do not force the next static step when the kitchen situation changed.";
          sendWsMessage(ws, {
            type: "conversation_initiation_client_data",
            dynamic_variables: {
              recipe_name: recipe.name,
              servings: String(recipe.servings),
              ingredients: ingredientsText,
              steps: stepsText,
              cooking_plan_rules: cookingPlan,
              user_cooking_context: stringifyCookingContext(cookingContext),
              hands_free_client_rules:
                "Act like an adaptive cooking copilot, not a recipe step reader. Keep responses under 2 short sentences. Use cooking_plan_rules and user_cooking_context for safe personalization. Never override hard dietary/allergy rules. Do not speak unless the user asks something, a timer finishes, or a client tool result requires a short confirmation. Do not ask 'are you still there' or send idle check-ins. When the user asks for next/back/repeat/go to step N or timer actions, call the matching client tool. The client has no WebSpeech fallback.",
            },
          });

          sourceNode = ctx.createMediaStreamSource(stream!);
          processor = ctx.createScriptProcessor(MIC_CHUNK_SIZE, 1, 1);
          silentGain = ctx.createGain();
          silentGain.gain.value = 0;

          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            if (agentSpeakingRef.current) return;
            const chunk = encodeAudioChunk(
              e.inputBuffer.getChannelData(0),
              nativeRate,
            );
            sendWsMessage(ws, { user_audio_chunk: chunk });
          };

          sourceNode.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(ctx.destination);

          if (mounted) {
            setMode("listening");
            setAgentMessage(
              "Hands-free is ready. Ask Chef to guide the next move.",
            );
            window.setTimeout(() => setAgentMessage(null), 4000);
          }
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
                  const responseText = cleanAgentText(
                    msg.agent_response_event.agent_response,
                  );
                  if (!responseText) break;
                  onAgentResponseRef.current(responseText);
                  setAgentMessage(responseText);
                  window.setTimeout(() => setAgentMessage(null), 5000);
                }
                break;
              case "user_transcript":
              case "user_transcription":
                {
                  const transcript =
                    msg.user_transcript_event?.user_transcript ??
                    msg.user_transcript_event?.transcript ??
                    msg.user_transcription_event?.user_transcript ??
                    msg.user_transcription_event?.transcript;
                  if (transcript) {
                    onUserTranscriptRef.current?.(transcript);
                    setAgentMessage(`Heard: ${transcript}`);
                  }
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
                  onClientToolCallRef.current(
                    msg.client_tool_call.tool_name,
                    msg.client_tool_call.parameters,
                    msg.client_tool_call.tool_call_id,
                    { sendToolResult, stopQueuedSpeech },
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
    cookingContext,
    recipe.ingredients,
    recipe.name,
    recipe.servings,
    recipe.steps,
  ]);

  return {
    agentMessage,
    connectionError,
    mode,
    speakLocal,
    stopQueuedSpeech,
  };
}
