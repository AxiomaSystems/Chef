export type TranscriptEntry = {
  id: number;
  speaker: "you" | "chef" | "system";
  text: string;
};

export type CookingTimer = {
  id: number;
  label: string;
  remainingSeconds: number;
  totalSeconds: number;
  paused: boolean;
  completed: boolean;
};

export type CookingAdaptation = {
  id: number;
  stepNumber: number | null;
  title: string;
  note: string;
};

export type HandsFreeGuidanceStyle =
  | "on_demand"
  | "close"
  | "brief"
  | "beginner";

export type HandsFreeVoiceActivationMode =
  | "wake_word"
  | "tap_to_talk"
  | "always_listening";

export type HandsFreeSessionContext = {
  notes: string;
  ingredientChanges: string;
  equipmentNotes: string;
  guidanceStyle: HandsFreeGuidanceStyle;
  startingStep: number;
  voiceActivationMode: HandsFreeVoiceActivationMode;
};

export type HandsFreeModeStatus =
  | "connecting"
  | "waiting_for_wake"
  | "waiting_for_tap"
  | "listening"
  | "speaking"
  | "paused"
  | "disconnected";
