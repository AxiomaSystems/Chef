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

export type HandsFreeModeStatus =
  | "connecting"
  | "listening"
  | "speaking"
  | "disconnected";
