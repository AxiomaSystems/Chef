"use client";

import { useEffect, useRef, useState } from "react";
import type { BaseRecipe } from "@cart/shared";
import type { CookingContext } from "@/lib/cooking-context";
import { stringifyCookingContext } from "@/lib/cooking-context";
import type {
  HandsFreeModeStatus,
  HandsFreeSessionContext,
} from "./hands-free-mode-types";

const TARGET_SAMPLE_RATE = 16000; // ElevenLabs expects 16 kHz PCM16 input
const MIC_CHUNK_SIZE = 2048;
const WAKE_COMMAND_TIMEOUT_MS = 20000;
const WAKE_WORD = "Chef";
const WAKE_WORD_VARIANTS = ["chef", "chief", "shef", "jeff"];
const WAKE_WORD_PATTERN = new RegExp(
  `\\b(?:${WAKE_WORD_VARIANTS.join("|")})\\b`,
  "i",
);

type SignedUrlResponse = { signed_url?: string; error?: string };
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult:
    | ((event: {
        results: ArrayLike<{
          isFinal: boolean;
          0: { transcript: string };
        }>;
      }) => void)
    | null;
  start: () => void;
  stop: () => void;
};
type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
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
  sessionContext?: HandsFreeSessionContext;
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

function stringifySessionContext(
  context: HandsFreeSessionContext | null | undefined,
) {
  if (!context) return "No extra session context was provided.";

  return [
    `Guidance style: ${context.guidanceStyle.replace(/_/g, " ")}`,
    `Starting visible step: ${context.startingStep}`,
    `Voice activation mode: ${context.voiceActivationMode.replace(/_/g, " ")}`,
    context.notes ? `Session notes: ${context.notes}` : null,
    context.ingredientChanges
      ? `Ingredient changes: ${context.ingredientChanges}`
      : null,
    context.equipmentNotes
      ? `Equipment notes: ${context.equipmentNotes}`
      : null,
  ]
    .filter(Boolean)
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

function getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useHandsFreeVoiceSession({
  cookingContext,
  onAgentResponse,
  onClientToolCall,
  onUserTranscript,
  recipe,
  sessionContext,
}: UseHandsFreeVoiceSessionOptions) {
  const [mode, setMode] = useState<HandsFreeModeStatus>("connecting");
  const [agentMessage, setAgentMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [wakeDebug, setWakeDebug] = useState<string | null>(null);
  const acceptsVoiceRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const agentSpeakingRef = useRef(false);
  const commandTimeoutRef = useRef<number | null>(null);
  const localSpeechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onAgentResponseRef = useRef(onAgentResponse);
  const onClientToolCallRef = useRef(onClientToolCall);
  const onUserTranscriptRef = useRef(onUserTranscript);
  const scheduledUntilRef = useRef(0); // for gapless audio scheduling
  const startWakeRecognitionRef = useRef<() => void>(() => {});
  const startAudioForwardingRef = useRef<() => void>(() => {});
  const stopAudioForwardingRef = useRef<() => void>(() => {});
  const wakeWordAvailableRef = useRef(true);
  const wsRef = useRef<WebSocket | null>(null);
  const voiceActivationMode =
    sessionContext?.voiceActivationMode ?? "wake_word";

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

  function clearCommandTimeout() {
    if (commandTimeoutRef.current === null) return;
    window.clearTimeout(commandTimeoutRef.current);
    commandTimeoutRef.current = null;
  }

  function formatWakePrompt() {
    return `Say "${WAKE_WORD}" when you need me.`;
  }

  function effectiveVoiceActivationMode() {
    return voiceActivationMode === "wake_word" && !wakeWordAvailableRef.current
      ? "tap_to_talk"
      : voiceActivationMode;
  }

  function formatIdlePrompt() {
    const effectiveMode = effectiveVoiceActivationMode();
    if (effectiveMode === "tap_to_talk") return "Tap the mic to talk.";
    if (effectiveMode === "always_listening") return "I'm listening.";
    return formatWakePrompt();
  }

  function idleMode(): HandsFreeModeStatus {
    return effectiveVoiceActivationMode() === "tap_to_talk"
      ? "waiting_for_tap"
      : "waiting_for_wake";
  }

  function armVoiceIdle(message?: string) {
    clearCommandTimeout();
    agentSpeakingRef.current = false;
    const effectiveMode = effectiveVoiceActivationMode();
    if (effectiveMode === "always_listening") {
      acceptsVoiceRef.current = true;
      startAudioForwardingRef.current();
      setMode((current) =>
        current === "disconnected" ? current : "listening",
      );
    } else {
      acceptsVoiceRef.current = false;
      stopAudioForwardingRef.current();
      if (effectiveMode === "wake_word") {
        startWakeRecognitionRef.current();
      }
      setMode((current) => (current === "disconnected" ? current : idleMode()));
    }
    if (message) {
      setAgentMessage(message);
      window.setTimeout(() => setAgentMessage(null), 3500);
    }
  }

  function openCommandGate(message = `Heard "${WAKE_WORD}". Go ahead.`) {
    clearCommandTimeout();
    acceptsVoiceRef.current = true;
    agentSpeakingRef.current = false;
    setMode((current) => (current === "disconnected" ? current : "listening"));
    setAgentMessage(message);
    setWakeDebug(null);
    window.setTimeout(() => setAgentMessage(null), 2500);
    void startAudioForwardingRef.current();
    if (effectiveVoiceActivationMode() === "always_listening") return;
    commandTimeoutRef.current = window.setTimeout(() => {
      armVoiceIdle(formatIdlePrompt());
    }, WAKE_COMMAND_TIMEOUT_MS);
  }

  function startTapToTalk() {
    if (
      effectiveVoiceActivationMode() !== "tap_to_talk" ||
      mode === "disconnected"
    ) {
      return;
    }
    openCommandGate("Go ahead.");
  }

  function stopTapToTalk() {
    if (effectiveVoiceActivationMode() !== "tap_to_talk") return;
    armVoiceIdle(formatIdlePrompt());
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
    setMode((current) =>
      current === "disconnected"
        ? current
        : acceptsVoiceRef.current
          ? "listening"
          : idleMode(),
    );
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
        armVoiceIdle(formatIdlePrompt());
      }
    };
    utterance.onerror = utterance.onend;
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    let mounted = true;
    let stream: MediaStream | null = null;
    let processor: ScriptProcessorNode | null = null;
    let recognition: BrowserSpeechRecognition | null = null;
    let recognitionShouldRun = false;
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
      clearCommandTimeout();
      acceptsVoiceRef.current = false;
      stopAudioForwardingRef.current();
      agentSpeakingRef.current = true;

      const startAt = Math.max(ctx.currentTime, scheduledUntilRef.current);
      src.start(startAt);
      scheduledUntilRef.current = startAt + buf.duration;

      if (mounted) setMode("speaking");
      src.onended = () => {
        audioSourcesRef.current.delete(src);
        src.disconnect();
        if (mounted && ctx.currentTime >= scheduledUntilRef.current - 0.05) {
          armVoiceIdle(formatIdlePrompt());
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

        const SpeechRecognition = getSpeechRecognitionConstructor();
        const wakeGateSupported = Boolean(SpeechRecognition);
        wakeWordAvailableRef.current =
          voiceActivationMode !== "wake_word" || wakeGateSupported;

        if (SpeechRecognition) {
          const warmupStream = await navigator.mediaDevices
            .getUserMedia({ audio: true, video: false })
            .catch(() => null);
          warmupStream?.getTracks().forEach((track) => track.stop());
        }

        const ws = new WebSocket(tokenData.signed_url);
        wsRef.current = ws;

        function stopAudioForwarding() {
          processor?.disconnect();
          sourceNode?.disconnect();
          silentGain?.disconnect();
          processor = null;
          sourceNode = null;
          silentGain = null;
          stream?.getTracks().forEach((t) => t.stop());
          stream = null;
        }

        async function startAudioForwarding() {
          if (stream || ws.readyState !== WebSocket.OPEN) return;

          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false,
            });
          } catch (error) {
            if (!mounted) return;
            setMode("disconnected");
            setConnectionError(
              error instanceof Error
                ? error.message
                : "Microphone access failed.",
            );
            return;
          }

          sourceNode = ctx.createMediaStreamSource(stream);
          processor = ctx.createScriptProcessor(MIC_CHUNK_SIZE, 1, 1);
          silentGain = ctx.createGain();
          silentGain.gain.value = 0;

          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            if (!acceptsVoiceRef.current) return;
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
        }

        startAudioForwardingRef.current = startAudioForwarding;
        stopAudioForwardingRef.current = stopAudioForwarding;

        if (SpeechRecognition) {
          recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";
          recognition.onresult = (event) => {
            if (!mounted || acceptsVoiceRef.current) return;
            for (let i = 0; i < event.results.length; i++) {
              const heard = event.results[i]?.[0]?.transcript ?? "";
              const normalizedHeard = heard.trim();
              if (normalizedHeard) {
                setWakeDebug(`Wake heard: ${normalizedHeard}`);
              }
              if (WAKE_WORD_PATTERN.test(heard)) {
                recognitionShouldRun = false;
                try {
                  recognition?.stop();
                } catch {
                  // Recognition may already be stopped.
                }
                openCommandGate();
                return;
              }
            }
          };
          recognition.onerror = (event) => {
            if (!mounted) return;
            recognitionShouldRun = false;
            wakeWordAvailableRef.current = false;
            armVoiceIdle("Wake phrase detection is unavailable. Tap to talk.");
            setWakeDebug(
              `Wake detector error: ${
                "error" in event ? String(event.error) : "unknown"
              }`,
            );
          };
          recognition.onend = () => {
            if (!mounted || !recognitionShouldRun) return;
            window.setTimeout(() => {
              try {
                recognition?.start();
              } catch {
                // Browser may already be starting recognition.
              }
            }, 250);
          };
          startWakeRecognitionRef.current = () => {
            if (!mounted || acceptsVoiceRef.current) return;
            recognitionShouldRun = true;
            try {
              recognition?.start();
            } catch {
              // Browser may already be starting recognition.
            }
          };
        } else {
          startWakeRecognitionRef.current = () => {};
        }

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
              session_cooking_context: stringifySessionContext(sessionContext),
              hands_free_client_rules:
                "Act like an adaptive cooking copilot, not a recipe step reader. Keep responses under 2 short sentences. Use cooking_plan_rules and user_cooking_context for safe personalization. Never override hard dietary/allergy rules. The client only forwards audio after the local wake phrase, so treat incoming user speech as intentionally addressed to Chef. Do not ask 'are you still there' or send idle check-ins. When the user asks for next/back/repeat/go to step N or timer actions, call the matching client tool.",
            },
          });

          if (mounted) {
            if (voiceActivationMode === "wake_word" && wakeGateSupported) {
              armVoiceIdle(`Hands-free is ready. ${formatIdlePrompt()}`);
              setWakeDebug("Wake detector is listening locally.");
            } else if (voiceActivationMode === "wake_word") {
              wakeWordAvailableRef.current = false;
              setWakeDebug("Wake detector is unavailable in this browser.");
              armVoiceIdle(
                "Wake phrase is unavailable here. Tap the mic to talk.",
              );
            } else {
              armVoiceIdle(`Hands-free is ready. ${formatIdlePrompt()}`);
              setWakeDebug(null);
            }
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
                  clearCommandTimeout();
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
      recognitionShouldRun = false;
      clearCommandTimeout();
      try {
        recognition?.stop();
      } catch {
        // Recognition may already be stopped.
      }
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
    sessionContext,
  ]);

  return {
    agentMessage,
    canTapToTalk: effectiveVoiceActivationMode() === "tap_to_talk",
    connectionError,
    mode,
    speakLocal,
    startTapToTalk,
    stopTapToTalk,
    stopQueuedSpeech,
    wakeDebug,
  };
}
