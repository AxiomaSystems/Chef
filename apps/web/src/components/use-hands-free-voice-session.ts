"use client";

import { useEffect, useRef, useState } from "react";
import { Conversation } from "@elevenlabs/react";
import type { Conversation as ElevenLabsConversation } from "@elevenlabs/react";
import type { BaseRecipe } from "@cart/shared";
import type { CookingContext } from "@/lib/cooking-context";
import { stringifyCookingContext } from "@/lib/cooking-context";
import type {
  HandsFreeModeStatus,
  HandsFreeSessionContext,
} from "./hands-free-mode-types";

const WAKE_COMMAND_TIMEOUT_MS = 5000;
const WAKE_WORD_LABEL = "Preppie or Prep";
const WAKE_WORD_VARIANTS = [
  "chef",
  "chief",
  "shef",
  "jeff",
  "prep",
  "preppy",
  "preppie",
  "preppi",
  "prepi",
  "pre pee",
  "pre p",
];
const WAKE_WORD_PATTERN = new RegExp(
  `\\b(?:${WAKE_WORD_VARIANTS.join("|")})\\b`,
  "i",
);

type ConversationTokenResponse = {
  conversation_token?: string;
  error?: string;
};
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
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const acceptsVoiceRef = useRef(false);
  const agentSpeakingRef = useRef(false);
  const commandTimeoutRef = useRef<number | null>(null);
  const conversationRef = useRef<ElevenLabsConversation | null>(null);
  const isAudioPausedRef = useRef(false);
  const onAgentResponseRef = useRef(onAgentResponse);
  const onClientToolCallRef = useRef(onClientToolCall);
  const onUserTranscriptRef = useRef(onUserTranscript);
  const sessionRunIdRef = useRef(0);
  const startWakeRecognitionRef = useRef<() => void>(() => {});
  const stopWakeRecognitionRef = useRef<() => void>(() => {});
  const toolCallIdRef = useRef(0);
  const wakeWordAvailableRef = useRef(true);
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

  function clearCommandTimeout() {
    if (commandTimeoutRef.current === null) return;
    window.clearTimeout(commandTimeoutRef.current);
    commandTimeoutRef.current = null;
  }

  function formatWakePrompt() {
    return `Say ${WAKE_WORD_LABEL} when you need me.`;
  }

  function effectiveVoiceActivationMode() {
    return voiceActivationMode !== "tap_to_talk" &&
      !wakeWordAvailableRef.current
      ? "tap_to_talk"
      : voiceActivationMode;
  }

  function usesWakePhraseMode() {
    return effectiveVoiceActivationMode() !== "tap_to_talk";
  }

  function formatIdlePrompt() {
    const effectiveMode = effectiveVoiceActivationMode();
    if (effectiveMode === "tap_to_talk") return "Tap to talk.";
    return formatWakePrompt();
  }

  function idleMode(): HandsFreeModeStatus {
    return effectiveVoiceActivationMode() === "tap_to_talk"
      ? "waiting_for_tap"
      : "waiting_for_wake";
  }

  function setConversationMicMuted(isMuted: boolean) {
    // In WebRTC mode, muting through the ElevenLabs SDK currently unpublishes
    // the LiveKit audio track, which can trigger negotiation timeouts in Chrome.
    // Keep the track published; local activation modes remain a UI/conversation
    // gate until we add a non-renegotiating audio gate.
    if (!isMuted) conversationRef.current?.setMicMuted(false);
  }

  function armVoiceIdle(message?: string) {
    clearCommandTimeout();
    agentSpeakingRef.current = false;
    if (isAudioPausedRef.current) {
      acceptsVoiceRef.current = false;
      stopWakeRecognitionRef.current();
      setMode((current) => (current === "disconnected" ? current : "paused"));
      return;
    }
    acceptsVoiceRef.current = false;
    setConversationMicMuted(true);
    if (usesWakePhraseMode()) {
      startWakeRecognitionRef.current();
    }
    setMode((current) => (current === "disconnected" ? current : idleMode()));
    if (message) {
      setAgentMessage(message);
      window.setTimeout(() => setAgentMessage(null), 3500);
    }
  }

  function openCommandGate(message = "Heard you. Go ahead.") {
    if (isAudioPausedRef.current) return;
    clearCommandTimeout();
    acceptsVoiceRef.current = true;
    agentSpeakingRef.current = false;
    setConversationMicMuted(false);
    setMode((current) => (current === "disconnected" ? current : "listening"));
    setAgentMessage(message);
    window.setTimeout(() => setAgentMessage(null), 2500);
    commandTimeoutRef.current = window.setTimeout(() => {
      armVoiceIdle(formatIdlePrompt());
    }, WAKE_COMMAND_TIMEOUT_MS);
  }

  function startTapToTalk() {
    if (
      effectiveVoiceActivationMode() !== "tap_to_talk" ||
      mode === "disconnected" ||
      isAudioPausedRef.current
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
    if (isAudioPausedRef.current) {
      setMode((current) => (current === "disconnected" ? current : "paused"));
      return;
    }
    setMode((current) =>
      current === "disconnected"
        ? current
        : acceptsVoiceRef.current
          ? "listening"
          : idleMode(),
    );
  }

  function setConversationOutputVolume(volume: number) {
    try {
      conversationRef.current?.setVolume({ volume });
    } catch {
      // Output volume control is best-effort across SDK/browser modes.
    }
  }

  function pauseAudioMode() {
    isAudioPausedRef.current = true;
    setIsAudioPaused(true);
    clearCommandTimeout();
    acceptsVoiceRef.current = false;
    agentSpeakingRef.current = false;
    stopWakeRecognitionRef.current();
    setConversationOutputVolume(0);
    setConversationMicMuted(true);
    setAgentMessage("Audio paused.");
    setMode((current) => (current === "disconnected" ? current : "paused"));
  }

  function resumeAudioMode() {
    isAudioPausedRef.current = false;
    setIsAudioPaused(false);
    setConversationOutputVolume(1);
    armVoiceIdle(formatIdlePrompt());
  }

  useEffect(() => {
    let mounted = true;
    const runId = sessionRunIdRef.current + 1;
    sessionRunIdRef.current = runId;
    let activeConversation: ElevenLabsConversation | null = null;
    let connectTimer: number | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let isClosing = false;
    let isConnecting = false;
    let recognition: BrowserSpeechRecognition | null = null;
    let recognitionShouldRun = false;

    function isCurrentRun() {
      return mounted && sessionRunIdRef.current === runId;
    }

    function scheduleReconnect(message = "Reconnecting voice...") {
      if (!isCurrentRun() || isClosing || reconnectTimer !== null) return;

      reconnectAttempts += 1;
      const delayMs = Math.min(1000 * reconnectAttempts, 5000);
      setMode("connecting");
      setConnectionError(message);
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, delayMs);
    }

    async function invokeClientTool(
      name: string,
      params: Record<string, unknown> | undefined,
    ) {
      toolCallIdRef.current += 1;
      const id = `${name}-${toolCallIdRef.current}`;

      return await new Promise<string>((resolve, reject) => {
        const context: ClientToolContext = {
          sendToolResult: (_id, { result, isError = false }) => {
            if (isError) reject(new Error(result));
            else resolve(result);
          },
          stopQueuedSpeech,
        };

        try {
          onClientToolCallRef.current(name, params ?? {}, id, context);
        } catch (error) {
          reject(error);
        }
      });
    }

    async function connect() {
      if (isConnecting || isClosing) return;
      isConnecting = true;
      try {
        if (reconnectAttempts === 0) {
          setConnectionError(null);
        }

        const tokenRes = await fetch("/api/elevenlabs/token", {
          method: "POST",
        });
        const tokenData = (await tokenRes
          .json()
          .catch(() => null)) as ConversationTokenResponse | null;
        if (!tokenRes.ok || !tokenData?.conversation_token) {
          throw new Error(
            tokenData?.error ?? "Unable to start ElevenLabs conversation.",
          );
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Microphone access is not available in this browser.",
          );
        }

        const SpeechRecognition = getSpeechRecognitionConstructor();
        const wakeGateSupported = Boolean(SpeechRecognition);
        wakeWordAvailableRef.current =
          voiceActivationMode === "tap_to_talk" || wakeGateSupported;

        if (SpeechRecognition) {
          const warmupStream = await navigator.mediaDevices
            .getUserMedia({
              audio: {
                autoGainControl: true,
                echoCancellation: true,
                noiseSuppression: true,
              },
              video: false,
            })
            .catch(() => null);
          warmupStream?.getTracks().forEach((track) => track.stop());
        }

        if (SpeechRecognition) {
          recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";
          recognition.onresult = (event) => {
            if (
              !isCurrentRun() ||
              acceptsVoiceRef.current ||
              isAudioPausedRef.current
            )
              return;
            for (let i = 0; i < event.results.length; i++) {
              const heard = event.results[i]?.[0]?.transcript ?? "";
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
          recognition.onerror = () => {
            if (!isCurrentRun()) return;
            recognitionShouldRun = false;
            wakeWordAvailableRef.current = false;
            armVoiceIdle("Wake phrase detection is unavailable. Tap to talk.");
          };
          recognition.onend = () => {
            if (
              !isCurrentRun() ||
              !recognitionShouldRun ||
              isAudioPausedRef.current
            )
              return;
            window.setTimeout(() => {
              if (isAudioPausedRef.current) return;
              try {
                recognition?.start();
              } catch {
                // Browser may already be starting recognition.
              }
            }, 250);
          };
          startWakeRecognitionRef.current = () => {
            if (
              !isCurrentRun() ||
              acceptsVoiceRef.current ||
              isAudioPausedRef.current
            )
              return;
            recognitionShouldRun = true;
            try {
              recognition?.start();
            } catch {
              // Browser may already be starting recognition.
            }
          };
          stopWakeRecognitionRef.current = () => {
            recognitionShouldRun = false;
            try {
              recognition?.stop();
            } catch {
              // Recognition may already be stopped.
            }
          };
        } else {
          startWakeRecognitionRef.current = () => {};
          stopWakeRecognitionRef.current = () => {};
        }

        const stepsText = recipe.steps
          .map((s) => `Step ${s.step}: ${s.what_to_do}`)
          .join("\n");
        const ingredientsText = stringifyRecipeIngredients(recipe.ingredients);
        const cookingPlan =
          "The recipe steps are a reference plan, not a rigid script. If the user says something went wrong, something burned, an ingredient is missing, timing changed, or they want to improvise, adapt the plan conversationally using recipe context, profile memory, and inventory. Do not force the next static step when the kitchen situation changed.";
        const conversation = await Conversation.startSession({
          connectionType: "webrtc",
          conversationToken: tokenData.conversation_token,
          useWakeLock: true,
          textOnly: false,
          dynamicVariables: {
            recipe_name: recipe.name,
            servings: String(recipe.servings),
            ingredients: ingredientsText,
            steps: stepsText,
            cooking_plan_rules: cookingPlan,
            user_cooking_context: stringifyCookingContext(cookingContext),
            session_cooking_context: stringifySessionContext(sessionContext),
            hands_free_client_rules:
              "Act like an adaptive cooking copilot, not a recipe step reader. Keep responses under 2 short sentences. Use cooking_plan_rules and user_cooking_context for safe personalization. Never override hard dietary/allergy rules. The client only forwards audio after the local wake phrase or tap-to-talk gate, so treat incoming user speech as intentionally addressed to Preppie. Do not ask 'are you still there' or send idle check-ins. When the user asks for next/back/repeat/go to step N or timer actions, call the matching client tool.",
          },
          clientTools: {
            adapt_current_step: (params: Record<string, unknown>) =>
              invokeClientTool("adapt_current_step", params),
            control_timer: (params: Record<string, unknown>) =>
              invokeClientTool("control_timer", params),
            finish_cooking: (params: Record<string, unknown>) =>
              invokeClientTool("finish_cooking", params),
            navigate_step: (params: Record<string, unknown>) =>
              invokeClientTool("navigate_step", params),
            record_cooking_note: (params: Record<string, unknown>) =>
              invokeClientTool("record_cooking_note", params),
            timer_control: (params: Record<string, unknown>) =>
              invokeClientTool("timer_control", params),
          },
          onConversationCreated: (conversation) => {
            activeConversation = conversation;
            if (isCurrentRun()) {
              conversationRef.current = conversation;
            }
          },
          onConnect: () => {
            if (!isCurrentRun()) return;
            reconnectAttempts = 0;
            setConnectionError(null);
            if (voiceActivationMode !== "tap_to_talk" && wakeGateSupported) {
              armVoiceIdle(`Hands-free is ready. ${formatIdlePrompt()}`);
            } else if (voiceActivationMode !== "tap_to_talk") {
              wakeWordAvailableRef.current = false;
              armVoiceIdle(
                "Wake phrase is unavailable here. Tap the mic to talk.",
              );
            } else {
              armVoiceIdle(`Hands-free is ready. ${formatIdlePrompt()}`);
            }
            window.setTimeout(() => setAgentMessage(null), 4000);
          },
          onDisconnect: (details) => {
            if (!isCurrentRun()) return;
            if (isClosing) {
              setMode("disconnected");
              return;
            }
            scheduleReconnect(
              details.reason === "error" && details.message
                ? details.message
                : "Voice paused after being idle. Reconnecting...",
            );
          },
          onError: (message) => {
            if (!isCurrentRun()) return;
            setMode("disconnected");
            setConnectionError(message);
          },
          onMessage: ({ message, source }) => {
            if (!isCurrentRun()) return;
            if (isAudioPausedRef.current) return;
            if (source === "user") {
              onUserTranscriptRef.current?.(message);
              setAgentMessage(`Heard: ${message}`);
              acceptsVoiceRef.current = false;
              clearCommandTimeout();
              setConversationMicMuted(true);
              return;
            }

            clearCommandTimeout();
            const responseText = cleanAgentText(message);
            if (!responseText) return;
            onAgentResponseRef.current(responseText);
            setAgentMessage(responseText);
            window.setTimeout(() => setAgentMessage(null), 5000);
          },
          onModeChange: ({ mode: nextMode }) => {
            if (!isCurrentRun()) return;
            if (isAudioPausedRef.current) {
              setMode("paused");
              return;
            }
            if (nextMode === "speaking") {
              clearCommandTimeout();
              acceptsVoiceRef.current = false;
              agentSpeakingRef.current = true;
              setConversationMicMuted(true);
              setMode("speaking");
              return;
            }

            agentSpeakingRef.current = false;
            armVoiceIdle(formatIdlePrompt());
          },
          onStatusChange: ({ status }) => {
            if (!isCurrentRun()) return;
            if (status === "connecting") setMode("connecting");
            if (status === "disconnected" && !reconnectTimer && isClosing) {
              setMode("disconnected");
            }
          },
        });

        activeConversation = conversation;
        if (!isCurrentRun()) {
          if (conversation.isOpen()) {
            await conversation.endSession().catch(() => {});
          }
          return;
        }

        conversationRef.current = conversation;
        setConversationOutputVolume(isAudioPausedRef.current ? 0 : 1);
        if (!isAudioPausedRef.current) {
          conversation.setMicMuted(false);
        }
      } catch (error) {
        if (!isCurrentRun()) return;
        setMode("disconnected");
        setConnectionError(
          error instanceof Error
            ? error.message
            : "Hands-free mode failed to start.",
        );
      } finally {
        isConnecting = false;
      }
    }

    connectTimer = window.setTimeout(() => {
      void connect();
    }, 0);

    return () => {
      mounted = false;
      isClosing = true;
      if (sessionRunIdRef.current === runId) {
        sessionRunIdRef.current += 1;
      }
      if (connectTimer !== null) {
        window.clearTimeout(connectTimer);
      }
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      recognitionShouldRun = false;
      stopWakeRecognitionRef.current = () => {};
      clearCommandTimeout();
      try {
        recognition?.stop();
      } catch {
        // Recognition may already be stopped.
      }
      const conversation = activeConversation;
      if (conversationRef.current === conversation) {
        conversationRef.current = null;
      }
      if (conversation?.isOpen()) {
        void conversation.endSession().catch(() => {});
      }
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
    isAudioPaused,
    mode,
    pauseAudioMode,
    resumeAudioMode,
    startTapToTalk,
    stopTapToTalk,
    stopQueuedSpeech,
  };
}
