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

export type HandsFreeModeStatus =
  | "connecting"
  | "waiting_for_wake"
  | "listening"
  | "speaking"
  | "disconnected";
