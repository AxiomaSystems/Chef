"use client";

import { useEffect, useRef, useState } from "react";
import type { BaseRecipe } from "@cart/shared";
import type { CookingContext } from "@/lib/cooking-context";
import { stringifyCookingContext } from "@/lib/cooking-context";

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
type Props = {
  recipe: BaseRecipe;
  cookingContext?: CookingContext;
  onClose: () => void;
};
type TimerCommand = "pause" | "resume" | "toggle";
type TranscriptEntry = {
  id: number;
  speaker: "you" | "chef" | "system";
  text: string;
};
type CookingTimer = {
  id: number;
  label: string;
  remainingSeconds: number;
  totalSeconds: number;
  paused: boolean;
  completed: boolean;
};
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
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

function parseTimerDuration(command: string) {
  const match = command.match(
    /\b(?:(\d+)\s*(?:hours?|hrs?|hr|h))?\s*(?:(\d+)\s*(?:minutes?|mins?|min|m))?\s*(?:(\d+)\s*(?:seconds?|secs?|sec|s))?\b/,
  );
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return totalSeconds > 0 ? totalSeconds : null;
}

function parseTimerLabel(command: string) {
  const forMatch = command.match(
    /\bfor\s+([a-z][a-z\s-]{1,24}?)(?:\s+for\s+\d|\s+\d|$)/,
  );
  const label = forMatch?.[1]?.trim();
  if (!label) return "timer";
  return (
    label.replace(/\b(timer|minutes?|mins?|seconds?|hours?)\b/g, "").trim() ||
    "timer"
  );
}

function parseTimerTargetLabel(command: string) {
  const match = command.match(
    /\b(?:pause|resume|start|continue|stop|cancel|clear)\s+(?:the\s+)?([a-z][a-z\s-]{1,24}?)\s+timer\b/,
  );
  return match?.[1]?.trim();
}

export function HandsFreeMode({ recipe, cookingContext, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timers, setTimers] = useState<CookingTimer[]>([]);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [mode, setMode] = useState<Mode>("connecting");
  const [agentMessage, setAgentMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const timerIdRef = useRef(0);
  const timersRef = useRef<CookingTimer[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const activeStepRef = useRef(0);
  const timerPausedRef = useRef(false);
  const transcriptIdRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const scheduledUntilRef = useRef(0); // for gapless audio scheduling
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const localSpeechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentStep = recipe.steps[activeStep] ?? null;
  const { title, body } = currentStep
    ? splitTitle(currentStep.what_to_do)
    : { title: "No steps.", body: "" };
  const stepIngredients = currentStep
    ? getStepIngredients(currentStep.what_to_do, recipe.ingredients)
    : [];
  const progress = recipe.steps.length
    ? ((activeStep + 1) / recipe.steps.length) * 100
    : 0;
  const nextStep = recipe.steps[activeStep + 1] ?? null;
  const currentPhase =
    activeStep === 0
      ? "Getting set up"
      : activeStep >= recipe.steps.length - 1
        ? "Finishing"
        : activeStep < recipe.steps.length / 3
          ? "Building momentum"
          : activeStep < (recipe.steps.length * 2) / 3
            ? "Active cooking"
            : "Bring it home";
  const contextLines = [
    cookingContext?.dietaryRules.length
      ? `${cookingContext.dietaryRules.length} food rules`
      : null,
    cookingContext?.goals.length ? `${cookingContext.goals[0]} goal` : null,
    cookingContext?.inventory.length
      ? `${cookingContext.inventory.length} pantry items`
      : null,
    cookingContext?.kitchen.length
      ? `${cookingContext.kitchen.length} kitchen defaults`
      : null,
  ].filter((line): line is string => Boolean(line));

  function addTranscript(speaker: TranscriptEntry["speaker"], text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    transcriptIdRef.current += 1;
    setTranscript((prev) => [
      ...prev.slice(-5),
      { id: transcriptIdRef.current, speaker, text: trimmed },
    ]);
  }

  function recordAction(text: string) {
    setLastAction(text);
    addTranscript("system", text);
  }

  function announce(text: string) {
    addTranscript("chef", text);
    speakLocal(text);
  }

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  useEffect(() => {
    timerPausedRef.current = isTimerPaused;
  }, [isTimerPaused]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimers((current) =>
        current.map((timer) => {
          if (timer.paused || timer.completed) return timer;
          const remainingSeconds = Math.max(0, timer.remainingSeconds - 1);
          if (remainingSeconds === 0 && timer.remainingSeconds > 0) {
            window.setTimeout(() => {
              announce(`${timer.label} timer is done.`);
            }, 0);
          }
          return {
            ...timer,
            remainingSeconds,
            completed: remainingSeconds === 0,
          };
        }),
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!timerPausedRef.current) {
        setElapsedSeconds((s) => s + 1);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (
        window as typeof window & {
          SpeechRecognition?: new () => BrowserSpeechRecognition;
          webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
        }
      ).SpeechRecognition ??
      (
        window as typeof window & {
          webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result?.[0]?.transcript?.trim();
      if (transcript) {
        setLastHeard(transcript);
        addTranscript("you", transcript);
        handleLocalCommand(transcript);
      }
    };
    recognition.onerror = () => {};
    recognition.onend = () => {
      if (wsRef.current?.readyState !== WebSocket.CLOSED) {
        try {
          recognition.start();
        } catch {
          // Recognition can already be active.
        }
      }
    };

    try {
      recognition.start();
    } catch {
      return;
    }

    return () => {
      recognition.onend = null;
      recognition.stop();
    };
  }, []);

  function stopQueuedSpeech() {
    window.speechSynthesis?.cancel();
    localSpeechUtteranceRef.current = null;
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

  function speakLocal(text: string) {
    if (!("speechSynthesis" in window)) return;

    stopQueuedSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    utterance.pitch = 1;
    localSpeechUtteranceRef.current = utterance;
    setMode("speaking");
    utterance.onend = () => {
      if (localSpeechUtteranceRef.current === utterance) {
        localSpeechUtteranceRef.current = null;
        setMode((current) =>
          current === "disconnected" ? current : "listening",
        );
      }
    };
    utterance.onerror = utterance.onend;
    window.speechSynthesis.speak(utterance);
  }

  function setTimerPaused(nextPaused: boolean, announce = true) {
    timerPausedRef.current = nextPaused;
    setIsTimerPaused(nextPaused);
    if (announce) {
      const message = nextPaused ? "Timer paused." : "Timer resumed.";
      addTranscript("chef", message);
      speakLocal(message);
    }
  }

  function controlTimer(command: TimerCommand, announce = true) {
    const nextPaused =
      command === "toggle" ? !timerPausedRef.current : command === "pause";
    setTimerPaused(nextPaused, announce);
  }

  function readStep(idx = activeStepRef.current, prefix?: string) {
    const step = recipe.steps[idx];
    if (!step) return;
    const message = `${prefix ? `${prefix} ` : ""}Step ${idx + 1} of ${recipe.steps.length}. ${step.what_to_do}`;
    addTranscript("chef", message);
    speakLocal(message);
  }

  function goToStep(idx: number, announce = true) {
    const boundedIdx = Math.max(0, Math.min(recipe.steps.length - 1, idx));
    activeStepRef.current = boundedIdx;
    setActiveStep(boundedIdx);
    setElapsedSeconds(0);
    setTimerPaused(false, false);
    if (announce) {
      readStep(boundedIdx);
    }
  }

  function startCookingTimer(label: string, totalSeconds: number) {
    timerIdRef.current += 1;
    const timer: CookingTimer = {
      id: timerIdRef.current,
      label,
      remainingSeconds: totalSeconds,
      totalSeconds,
      paused: false,
      completed: false,
    };
    setTimers((current) => [timer, ...current.filter((t) => !t.completed)]);
    announce(`Started ${label} timer for ${formatTime(totalSeconds)}.`);
  }

  function updateCookingTimers(
    action: "pause" | "resume" | "stop",
    label?: string,
  ) {
    const normalizedLabel = label?.trim().toLowerCase();
    const matchingTimers = timersRef.current.filter(
      (timer) =>
        !timer.completed &&
        (!normalizedLabel ||
          timer.label.toLowerCase().includes(normalizedLabel)),
    );
    if (matchingTimers.length === 0) {
      announce(
        normalizedLabel
          ? `I don't see an active ${normalizedLabel} timer.`
          : "I don't see any active timers.",
      );
      return;
    }
    const ids = new Set(matchingTimers.map((timer) => timer.id));
    if (action === "stop") {
      setTimers((current) => current.filter((timer) => !ids.has(timer.id)));
      announce(
        matchingTimers.length === 1
          ? `Stopped the ${matchingTimers[0].label} timer.`
          : `Stopped ${matchingTimers.length} timers.`,
      );
      return;
    }
    setTimers((current) =>
      current.map((timer) =>
        ids.has(timer.id) ? { ...timer, paused: action === "pause" } : timer,
      ),
    );
    announce(
      matchingTimers.length === 1
        ? `${matchingTimers[0].label} timer ${action === "pause" ? "paused" : "resumed"}.`
        : `${matchingTimers.length} timers ${action === "pause" ? "paused" : "resumed"}.`,
    );
  }

  function announceTimerStatus() {
    const activeTimers = timersRef.current.filter((timer) => !timer.completed);
    if (activeTimers.length === 0) {
      announce("No active timers right now.");
      return;
    }
    announce(
      activeTimers
        .map(
          (timer) =>
            `${timer.label}: ${formatTime(timer.remainingSeconds)} ${timer.paused ? "paused" : "left"}`,
        )
        .join(". "),
    );
  }

  function handleLocalCommand(text: string) {
    const command = text.toLowerCase();
    if (/\b(start|set)\b.*\btimer\b/.test(command)) {
      const duration = parseTimerDuration(command);
      if (duration) {
        recordAction("Started a named cooking timer.");
        startCookingTimer(parseTimerLabel(command), duration);
      } else {
        recordAction("Asked for timer duration.");
        announce("Tell me how long to set the timer for.");
      }
      return true;
    }
    if (/\b(how much time|time left|timer status|timers)\b/.test(command)) {
      recordAction("Read active timer status.");
      announceTimerStatus();
      return true;
    }
    if (/\b(stop|cancel|clear)\b.*\btimer\b/.test(command)) {
      recordAction("Stopped timer.");
      updateCookingTimers("stop", parseTimerTargetLabel(command));
      return true;
    }
    if (/\b(pause|stop|hold)\b.*\b(time|timer|clock)\b/.test(command)) {
      const targetLabel = parseTimerTargetLabel(command);
      if (targetLabel || timersRef.current.some((timer) => !timer.completed)) {
        recordAction("Paused active timer.");
        updateCookingTimers("pause", targetLabel);
        return true;
      }
      recordAction("Paused step timer.");
      controlTimer("pause");
      return true;
    }
    if (/\b(resume|start|continue)\b.*\b(time|timer|clock)\b/.test(command)) {
      const targetLabel = parseTimerTargetLabel(command);
      if (targetLabel || timersRef.current.some((timer) => !timer.completed)) {
        recordAction("Resumed active timer.");
        updateCookingTimers("resume", targetLabel);
        return true;
      }
      recordAction("Resumed step timer.");
      controlTimer("resume");
      return true;
    }
    if (/\b(next|continue|go on)\b/.test(command)) {
      recordAction("Moved to the next recipe step.");
      manualNav("next");
      return true;
    }
    if (/\b(back|previous|go back)\b/.test(command)) {
      recordAction("Moved to the previous recipe step.");
      manualNav("prev");
      return true;
    }
    if (/\b(repeat|read that again|say that again)\b/.test(command)) {
      recordAction("Repeated the current step.");
      readStep();
      return true;
    }
    return false;
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
        if (action === "start" || action === "set") {
          const seconds = Number(
            params.duration_seconds ??
              params.seconds ??
              Number(params.minutes ?? 0) * 60,
          );
          if (Number.isFinite(seconds) && seconds > 0) {
            startCookingTimer(String(params.label ?? "timer"), seconds);
            sendWsMessage(ws, {
              type: "client_tool_result",
              tool_call_id: id,
              result: `Started ${String(params.label ?? "timer")} timer for ${formatTime(seconds)}.`,
              is_error: false,
            });
            return;
          }
        }
        if (action === "status") {
          const activeTimers = timersRef.current.filter(
            (timer) => !timer.completed,
          );
          const result =
            activeTimers.length > 0
              ? activeTimers
                  .map(
                    (timer) =>
                      `${timer.label}: ${formatTime(timer.remainingSeconds)} ${timer.paused ? "paused" : "left"}`,
                  )
                  .join(". ")
              : "No active timers.";
          sendWsMessage(ws, {
            type: "client_tool_result",
            tool_call_id: id,
            result,
            is_error: false,
          });
          announceTimerStatus();
          return;
        }
        if (action === "stop" || action === "cancel") {
          updateCookingTimers("stop", String(params.label ?? ""));
          sendWsMessage(ws, {
            type: "client_tool_result",
            tool_call_id: id,
            result: "Timer stopped.",
            is_error: false,
          });
          return;
        }
        if (action === "pause" || action === "resume" || action === "toggle") {
          const label = String(params.label ?? "").trim();
          if (label) {
            updateCookingTimers(action === "toggle" ? "pause" : action, label);
          } else {
            controlTimer(action);
          }
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
        addTranscript("system", `Jumped to step ${idx + 1}.`);
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
              user_cooking_context: stringifyCookingContext(cookingContext),
              hands_free_client_rules:
                "Keep responses under 2 short sentences. Use user_cooking_context for safe personalization. Never override hard dietary/allergy rules. For next, back, previous, repeat, pause timer, resume timer, stop timer, timer status, or starting a named timer, call the client tool instead of explaining. The client reads steps aloud locally for speed.",
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

          if (mounted) {
            setMode("listening");
            window.setTimeout(() => {
              if (!mounted || activeStepRef.current !== 0) return;
              readStep(0, "Hands-free is ready. I'll start with");
            }, 250);
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
                  const responseText = msg.agent_response_event.agent_response;
                  handleLocalCommand(responseText);
                  addTranscript("chef", responseText);
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
    cookingContext,
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
  const visibleTimers = timers.filter((timer) => !timer.completed).slice(0, 4);
  const completedTimers = timers.filter((timer) => timer.completed).slice(0, 2);

  return (
    <div className="fixed inset-0 z-80 overflow-y-auto bg-[#081514] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[#ffb84d]/20 blur-3xl" />
        <div className="absolute bottom-[-18rem] right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[#3dd6c6]/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-dvh flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-amber-300">
              Cook with Chef
            </p>
            <h2 className="truncate text-lg font-black text-white sm:text-2xl">
              {recipe.name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => controlTimer("toggle")}
              aria-label={isTimerPaused ? "Resume timer" : "Pause timer"}
              className={`hidden items-center gap-3 rounded-2xl border px-4 py-2 text-left transition-colors sm:flex ${
                isTimerPaused
                  ? "border-amber-300/50 bg-amber-300/15"
                  : "border-white/10 bg-white/10 hover:bg-white/15"
              }`}
            >
              <span className="material-symbols-outlined text-[24px] text-amber-300">
                {isTimerPaused ? "play_arrow" : "pause"}
              </span>
              <span>
                <span className="block font-mono text-2xl font-black leading-none tabular-nums text-amber-300">
                  {formatTime(elapsedSeconds)}
                </span>
                <span className="block text-[9px] font-bold uppercase tracking-widest text-white/45">
                  {isTimerPaused ? "Paused" : "This step"}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Exit cooking copilot"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            >
              <span className="material-symbols-outlined text-[22px]">
                close
              </span>
            </button>
          </div>
        </header>

        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-amber-300 via-orange-400 to-teal-300 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <main className="grid flex-1 gap-5 px-4 py-5 pb-28 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:pb-6">
          <section className="flex min-h-[55dvh] flex-col justify-between rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-7">
            <div>
              <div className="mb-6 flex items-center justify-center">
                <div className="relative grid h-32 w-32 place-items-center sm:h-40 sm:w-40">
                  <span
                    className={`absolute inset-0 rounded-full ${
                      mode === "listening"
                        ? "animate-ping bg-amber-300/20"
                        : mode === "speaking"
                          ? "bg-teal-300/20"
                          : "bg-white/10"
                    }`}
                  />
                  <span className="absolute inset-4 rounded-full border border-white/15 bg-gradient-to-br from-white/18 to-white/5 shadow-inner" />
                  <span
                    className={`relative grid h-20 w-20 place-items-center rounded-full sm:h-24 sm:w-24 ${ring}`}
                  >
                    <span className="material-symbols-outlined text-[34px]">
                      {icon}
                    </span>
                  </span>
                </div>
              </div>

              <div className="mx-auto max-w-3xl text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
                  {label}
                </p>
                <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                  {agentMessage ??
                    (mode === "listening"
                      ? "I'm listening. Ask what to do next."
                      : mode === "speaking"
                        ? "Chef is talking you through it."
                        : mode === "connecting"
                          ? "Setting up your kitchen copilot..."
                          : "Voice is offline, but controls still work.")}
                </h1>
                {connectionError ? (
                  <p className="mx-auto mt-4 max-w-xl rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-100/85">
                    {connectionError}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-black/18 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
                  Live transcript
                </p>
                <p className="text-[11px] text-white/35">
                  Say “next”, “repeat”, or “pause timer”
                </p>
              </div>
              {(lastHeard || lastAction) && (
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-white/35">
                      Heard
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-white/75">
                      {lastHeard ?? "Waiting for your voice..."}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-amber-300/15 bg-amber-300/10 px-4 py-3">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-amber-200/60">
                      Chef did
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-amber-50/85">
                      {lastAction ?? "No command action yet."}
                    </span>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {transcript.length > 0 ? (
                  transcript.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex gap-3 ${
                        entry.speaker === "you" ? "justify-end" : ""
                      }`}
                    >
                      <div
                        className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                          entry.speaker === "you"
                            ? "bg-amber-300 text-[#1b1405]"
                            : entry.speaker === "system"
                              ? "bg-white/8 text-white/55"
                              : "bg-white/12 text-white/86"
                        }`}
                      >
                        <span className="mb-1 block text-[9px] font-black uppercase tracking-widest opacity-60">
                          {entry.speaker === "you"
                            ? "You"
                            : entry.speaker === "system"
                              ? "Action"
                              : "Chef"}
                        </span>
                        {entry.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-white/45">
                    Your conversation will appear here so you can see what Chef
                    heard and what it did.
                  </p>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300/80">
                Kitchen state
              </p>
              <h3 className="mt-2 text-2xl font-black text-white">
                {currentPhase}
              </h3>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => controlTimer("toggle")}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    isTimerPaused
                      ? "border-amber-300/45 bg-amber-300/12"
                      : "border-white/10 bg-black/15 hover:bg-white/10"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                    Step timer
                  </span>
                  <span className="mt-1 block font-mono text-3xl font-black tabular-nums text-amber-300">
                    {formatTime(elapsedSeconds)}
                  </span>
                  <span className="mt-1 block text-xs text-white/45">
                    {isTimerPaused ? "Paused" : "Running"}
                  </span>
                </button>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                    Progress
                  </span>
                  <span className="mt-1 block text-3xl font-black text-white">
                    {activeStep + 1}/{recipe.steps.length}
                  </span>
                  <span className="mt-1 block text-xs text-white/45">
                    Recipe steps
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                    Active timers
                  </span>
                  <span className="text-xs text-white/35">
                    Say “start a pasta timer for 8 minutes”
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {visibleTimers.length > 0 ? (
                    visibleTimers.map((timer) => (
                      <div
                        key={timer.id}
                        className="rounded-xl bg-white/8 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-bold text-white">
                            {timer.label}
                          </span>
                          <span className="font-mono text-sm font-black tabular-nums text-amber-300">
                            {formatTime(timer.remainingSeconds)}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-amber-300 transition-all duration-500"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  (timer.remainingSeconds /
                                    timer.totalSeconds) *
                                    100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-6 text-white/45">
                      No named timers yet. Chef can keep track of parallel
                      cooking tasks while you work.
                    </p>
                  )}
                  {completedTimers.map((timer) => (
                    <button
                      key={timer.id}
                      type="button"
                      onClick={() =>
                        setTimers((current) =>
                          current.filter((item) => item.id !== timer.id),
                        )
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-amber-300/30 bg-amber-300/12 px-3 py-2 text-left text-sm text-amber-100"
                    >
                      <span>{timer.label} timer done</span>
                      <span className="material-symbols-outlined text-[16px]">
                        close
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-[1.6rem] border border-white/10 bg-[#fff8e8] p-5 text-[#142326] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9b5b05]">
                  Recipe reference
                </p>
                <span className="rounded-full bg-[#142326]/8 px-3 py-1 text-xs font-bold">
                  Step {activeStep + 1}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-black leading-tight">
                {title}
              </h3>
              {body ? (
                <p className="mt-3 text-sm leading-6 text-[#315b5f]">{body}</p>
              ) : null}

              {stepIngredients.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {stepIngredients.map((ing, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-[#f4790d]/12 px-3 py-1.5 text-xs font-bold text-[#7a3d00]"
                    >
                      {ing.amount} {ing.unit}{" "}
                      {ing.display_ingredient ?? ing.canonical_ingredient}
                    </span>
                  ))}
                </div>
              ) : null}

              {nextStep ? (
                <div className="mt-5 rounded-2xl bg-white/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#6e8588]">
                    Next likely action
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#142326]">
                    {nextStep.what_to_do}
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-white/70 p-4 text-sm font-semibold text-[#142326]">
                  Last step. Ask Chef for plating or cleanup help.
                </div>
              )}
            </section>

            <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
                Try saying
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "What do I do now?",
                  "Start a pasta timer for 8 minutes",
                  "How much time left?",
                  "Repeat that",
                  "Pause timer",
                  "Next step",
                  "What can I prep?",
                ].map((prompt) => (
                  <span
                    key={prompt}
                    className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-white/70"
                  >
                    {prompt}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-[1.6rem] border border-teal-200/10 bg-teal-200/[0.07] p-5 backdrop-blur-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-200/70">
                Chef knows
              </p>
              {contextLines.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {contextLines.map((line) => (
                    <span
                      key={line}
                      className="rounded-full border border-teal-200/10 bg-teal-200/10 px-3 py-2 text-xs font-semibold text-teal-50/80"
                    >
                      {line}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-white/45">
                  No profile or pantry context loaded yet. Chef will guide from
                  the recipe only.
                </p>
              )}
            </section>
          </aside>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-[81] border-t border-white/10 bg-[#081514]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:relative lg:border-t-0 lg:bg-transparent lg:pb-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => manualNav("prev")}
              disabled={activeStep === 0}
              aria-label="Previous step"
              className="flex h-13 w-13 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[26px]">
                arrow_back
              </span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => readStep()}
                className="hidden rounded-full bg-white/10 px-4 py-3 text-sm font-bold text-white/75 hover:bg-white/15 sm:block"
              >
                Repeat
              </button>
              <button
                type="button"
                onClick={() => controlTimer("toggle")}
                className="rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-[#1c1505] shadow-[0_14px_40px_rgba(251,191,36,0.25)]"
              >
                {isTimerPaused ? "Resume" : "Pause"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => manualNav("next")}
              disabled={activeStep >= recipe.steps.length - 1}
              aria-label="Next step"
              className="flex h-13 w-13 items-center justify-center rounded-full bg-amber-300 text-[#1c1505] transition-colors hover:bg-amber-200 disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[26px]">
                arrow_forward
              </span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
