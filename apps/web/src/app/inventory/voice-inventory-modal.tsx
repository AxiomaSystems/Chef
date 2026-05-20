"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  INVENTORY_UNIT_OPTIONS,
  type AiInventoryStructureItem,
  type KitchenInventoryItem,
} from "@cart/shared";
import {
  addInventoryItemAction,
  structureInventoryTranscriptAction,
  updateInventoryItemAction,
} from "./actions";
import { IngredientImage } from "./ingredient-image";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };

type ReviewAction = "add" | "update" | "separate" | "ignore";

type ReviewRow = AiInventoryStructureItem & {
  id: string;
  action: ReviewAction;
};

type Props = {
  currentItems: KitchenInventoryItem[];
  onClose: () => void;
  onSaved: (items: KitchenInventoryItem[]) => void;
};

function inventoryName(item: KitchenInventoryItem) {
  return (
    item.display_name || item.label || item.ingredient?.canonical_name || ""
  );
}

function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

function formatExisting(item: KitchenInventoryItem | undefined) {
  if (!item) return "No existing item";
  const name = inventoryName(item);
  const amount =
    item.estimated_amount !== undefined && item.estimated_amount !== null
      ? `${item.estimated_amount} ${item.unit ?? ""}`.trim()
      : "No quantity";
  return [name, item.label, amount].filter(Boolean).join(" / ");
}

const BRAND_DEFAULT_ITEMS: Record<string, string> = {
  monster: "energy drink",
  "red bull": "energy drink",
  gatorade: "sports drink",
  coke: "soda",
  "coca cola": "soda",
  pepsi: "soda",
  sprite: "soda",
  fanta: "soda",
  doritos: "chips",
  lays: "chips",
  cheetos: "chips",
  pringles: "chips",
  oreo: "cookies",
  kellogg: "cereal",
  kelloggs: "cereal",
  cheerios: "cereal",
  heinz: "condiment",
  kraft: "pantry item",
  nestle: "pantry item",
  santino: "cooking oil",
  walmart: "grocery item",
  "great value": "grocery item",
};

function stripBrandFromName(name: string, brand: string) {
  return name
    .replace(
      new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(input: string) {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function displayNameForRow(row: ReviewRow) {
  const displayName = row.display_name.trim();
  if (displayName) return displayName;

  const itemName = toTitleCase(row.item_name);
  const brand = row.brand?.trim();
  if (!brand) return itemName;
  if (itemName.toLowerCase().includes(brand.toLowerCase())) return itemName;
  return `${brand} ${itemName}`.trim();
}

function normalizeVoiceUnit(unit: string) {
  const normalized = unit.trim().toLowerCase();
  const unitMap: Record<string, string> = {
    kilogram: "kg",
    kilograms: "kg",
    kilo: "kg",
    kilos: "kg",
    gram: "g",
    grams: "g",
    pound: "lb",
    pounds: "lb",
    ounce: "oz",
    ounces: "oz",
    tablespoon: "tbsp",
    tablespoons: "tbsp",
    teaspoon: "tsp",
    teaspoons: "tsp",
  };
  return unitMap[normalized] ?? normalized;
}

function getSpeechConstructor() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

function createRows(
  items: AiInventoryStructureItem[],
  existingItems: KitchenInventoryItem[],
): ReviewRow[] {
  const existingByName = new Map(
    existingItems.map((item) => [normalizeName(inventoryName(item)), item]),
  );

  const existingByLabel = new Map(
    existingItems
      .filter((item) => item.label?.trim())
      .map((item) => [normalizeName(item.label ?? ""), item]),
  );

  return items.map((item, index) => {
    let normalizedItem = { ...item };
    const itemNameKey = normalizeName(item.item_name);
    const detectedBrand =
      item.brand?.trim() ||
      Object.keys(BRAND_DEFAULT_ITEMS).find((brand) =>
        itemNameKey.includes(normalizeName(brand)),
      ) ||
      existingItems.find((existing) => {
        const label = existing.label?.trim();
        return label ? itemNameKey.includes(normalizeName(label)) : false;
      })?.label;

    if (detectedBrand) {
      const stripped = stripBrandFromName(item.item_name, detectedBrand);
      const defaultItem =
        BRAND_DEFAULT_ITEMS[normalizeName(detectedBrand)] ||
        existingByLabel.get(normalizeName(detectedBrand))?.ingredient
          ?.canonical_name ||
        stripped;
      normalizedItem = {
        ...normalizedItem,
        brand: detectedBrand,
        item_name: defaultItem || item.item_name,
        display_name:
          normalizedItem.display_name?.trim() ||
          [detectedBrand, stripped || defaultItem]
            .filter(Boolean)
            .map(toTitleCase)
            .join(" "),
      };
    }

    const matched =
      existingItems.find(
        (existing) => existing.id === normalizedItem.matched_existing_id,
      ) ?? existingByName.get(normalizeName(normalizedItem.item_name));
    const conflicts = [...normalizedItem.conflicts];

    if (matched && !normalizedItem.matched_existing_id) {
      conflicts.push({
        type: "duplicate",
        message: "This sounds like an item already in inventory.",
        existing_value: formatExisting(matched),
        spoken_value:
          `${normalizedItem.brand ? `${normalizedItem.brand} ` : ""}${normalizedItem.quantity} ${normalizedItem.unit}`.trim(),
      });
    }

    return {
      ...normalizedItem,
      display_name: displayNameForRow(normalizedItem as ReviewRow),
      id: `${index}-${normalizedItem.item_name}`,
      matched_existing_id: matched?.id ?? normalizedItem.matched_existing_id,
      conflicts,
      action: matched ? "update" : "add",
    };
  });
}

function isLikelyKitchenItem(row: ReviewRow) {
  const text = `${row.item_name} ${row.brand ?? ""}`.toLowerCase();
  return ![
    "perfume",
    "cologne",
    "soap",
    "shampoo",
    "detergent",
    "lotion",
    "medicine",
    "toothpaste",
    "deodorant",
  ].some((term) => text.includes(term));
}

export function VoiceInventoryModal({ currentItems, onClose, onSaved }: Props) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedAudioRef = useRef<Blob[]>([]);
  const stopRecorderResolverRef = useRef<((blob: Blob | null) => void) | null>(
    null,
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserFrameRef = useRef<number | null>(null);
  const keepListeningRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const restartTimeoutRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [hasRecording, setHasRecording] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [potentialRows, setPotentialRows] = useState<ReviewRow[]>([]);
  const [showPotentialErrors, setShowPotentialErrors] = useState(false);
  const [aiInstructions, setAiInstructions] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transcript = `${finalTranscript} ${interimTranscript}`.trim();
  const acceptedCount = rows.filter((row) => row.action !== "ignore").length;
  const sessionStatus = recording
    ? "Listening..."
    : transcript
      ? "Ready to review or record more"
      : hasRecording
        ? "Audio captured"
        : "Ready to record";
  const existingById = useMemo(
    () => new Map(currentItems.map((item) => [item.id, item])),
    [currentItems],
  );

  useEffect(() => {
    if (!recording) return;
    const interval = window.setInterval(() => {
      setElapsed((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [recording]);

  function stopMicMonitor() {
    if (analyserFrameRef.current !== null) {
      window.cancelAnimationFrame(analyserFrameRef.current);
      analyserFrameRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setVoiceLevel(0);
  }

  function startAudioRecorder(stream: MediaStream) {
    if (typeof MediaRecorder === "undefined") {
      throw new Error("This browser cannot record microphone audio.");
    }

    const recorder = new MediaRecorder(stream);
    audioChunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob =
        audioChunksRef.current.length > 0
          ? new Blob(audioChunksRef.current, {
              type: recorder.mimeType || "audio/webm",
            })
          : null;
      audioChunksRef.current = [];
      if (blob) {
        recordedAudioRef.current.push(blob);
        setHasRecording(true);
      }
      stopRecorderResolverRef.current?.(blob);
      stopRecorderResolverRef.current = null;
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
  }

  function stopAudioRecorder() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return Promise.resolve(null);
    }

    return new Promise<Blob | null>((resolve) => {
      stopRecorderResolverRef.current = resolve;
      recorder.stop();
      mediaRecorderRef.current = null;
    });
  }

  useEffect(() => {
    return () => {
      keepListeningRef.current = false;
      intentionalStopRef.current = true;
      if (restartTimeoutRef.current !== null) {
        window.clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      void stopAudioRecorder();
      stopMicMonitor();
      recognitionRef.current?.stop();
    };
  }, []);

  async function startMicMonitor() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser cannot read the microphone.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const AudioContextConstructor =
      window.AudioContext ??
      (
        window as Window &
          typeof globalThis & {
            webkitAudioContext?: typeof AudioContext;
          }
      ).webkitAudioContext;

    if (!AudioContextConstructor) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("This browser cannot analyze microphone audio.");
    }

    const audioContext = new AudioContextConstructor();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const average =
        data.reduce((total, value) => total + value, 0) / data.length;
      setVoiceLevel(Math.min(1, average / 90));
      analyserFrameRef.current = window.requestAnimationFrame(tick);
    };

    mediaStreamRef.current = stream;
    audioContextRef.current = audioContext;
    tick();
    return stream;
  }

  async function startRecording() {
    setError(null);
    setSpeechNotice(null);
    setReviewed(false);
    setRows([]);
    setPotentialRows([]);
    preserveInterimTranscript();
    setInterimTranscript("");
    if (restartTimeoutRef.current !== null) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    let stream: MediaStream;
    try {
      stream = await startMicMonitor();
      startAudioRecorder(stream);
    } catch (micError) {
      stopMicMonitor();
      setError(
        micError instanceof Error
          ? micError.message
          : "Microphone access failed.",
      );
      return;
    }

    const SpeechRecognition = getSpeechConstructor();
    if (!SpeechRecognition) {
      setSpeechNotice(
        "Live captions are not supported here. Review will transcribe the recording.",
      );
      setRecording(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let nextFinal = "";
      let nextInterim = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript ?? "";
        if (result?.isFinal) {
          nextFinal += `${text} `;
        } else {
          nextInterim += text;
        }
      }

      if (nextFinal) {
        setFinalTranscript((current) => `${current} ${nextFinal}`.trim());
      }
      setInterimTranscript(nextInterim.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }

      if (event.error === "not-allowed") {
        keepListeningRef.current = false;
        setSpeechNotice("Live captions were blocked. Recording still works.");
        return;
      }

      if (event.error === "audio-capture") {
        keepListeningRef.current = false;
        setSpeechNotice(
          "Live captions lost microphone access. Recording still works.",
        );
        return;
      }

      keepListeningRef.current = false;
      setSpeechNotice(
        "Live captions stopped. The recording is still being captured.",
      );
    };
    recognition.onend = () => {
      if (keepListeningRef.current && !intentionalStopRef.current) {
        restartTimeoutRef.current = window.setTimeout(() => {
          restartTimeoutRef.current = null;
          try {
            recognition.start();
          } catch {
            setSpeechNotice(
              "Live captions stopped. The recording is still being captured.",
            );
          }
        }, 150);
        return;
      }
    };
    recognitionRef.current = recognition;
    keepListeningRef.current = true;
    intentionalStopRef.current = false;
    try {
      recognition.start();
    } catch {
      keepListeningRef.current = false;
      setSpeechNotice(
        "Live captions could not start. Review will transcribe the recording.",
      );
    }
    setRecording(true);
  }

  function preserveInterimTranscript() {
    if (interimTranscript.trim()) {
      setFinalTranscript((current) => `${current} ${interimTranscript}`.trim());
      setInterimTranscript("");
    }
  }

  async function stopRecording() {
    const nextTranscript = `${finalTranscript} ${interimTranscript}`.trim();
    preserveInterimTranscript();
    keepListeningRef.current = false;
    intentionalStopRef.current = true;
    if (restartTimeoutRef.current !== null) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    recognitionRef.current?.stop();
    await stopAudioRecorder();
    stopMicMonitor();
    setRecording(false);
    return nextTranscript;
  }

  function clearSession() {
    keepListeningRef.current = false;
    intentionalStopRef.current = true;
    if (restartTimeoutRef.current !== null) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    recognitionRef.current?.stop();
    void stopAudioRecorder();
    stopMicMonitor();
    setRecording(false);
    setElapsed(0);
    setFinalTranscript("");
    setInterimTranscript("");
    recordedAudioRef.current = [];
    audioChunksRef.current = [];
    setHasRecording(false);
    setRows([]);
    setPotentialRows([]);
    setReviewed(false);
    setSpeechNotice(null);
    setError(null);
  }

  async function transcribeRecordedAudio() {
    const transcripts: string[] = [];

    for (const [index, audio] of recordedAudioRef.current.entries()) {
      const formData = new FormData();
      formData.append("audio", audio, `voice-inventory-${index + 1}.webm`);
      const response = await fetch("/api/stt", {
        method: "POST",
        body: formData,
      }).catch(() => null);

      if (!response?.ok) continue;
      const data = (await response.json().catch(() => ({}))) as {
        transcript?: string;
      };
      if (data.transcript?.trim()) {
        transcripts.push(data.transcript.trim());
      }
    }

    return transcripts.join(" ").trim();
  }

  async function reviewTranscript() {
    const liveText = recording ? await stopRecording() : transcript.trim();
    let text = liveText;

    if (recordedAudioRef.current.length > 0 && (!text || speechNotice)) {
      setLoading(true);
      setError(null);
      const audioText = await transcribeRecordedAudio();
      text = [text, audioText].filter(Boolean).join(" ").trim();
      if (audioText) {
        setFinalTranscript((current) =>
          [current, audioText].filter(Boolean).join(" ").trim(),
        );
      }
    }

    if (!text) {
      setError(
        "The mic recorded audio, but no words were transcribed. Try speaking closer to the mic or check the selected input device.",
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await structureInventoryTranscriptAction({
      transcript: text,
      allowedUnits: [...INVENTORY_UNIT_OPTIONS],
      inventory: currentItems.map((item) => ({
        id: item.id,
        name: inventoryName(item),
        canonical_name: item.ingredient?.canonical_name ?? null,
        category: item.ingredient?.category ?? null,
        label: item.label ?? null,
        estimated_amount: item.estimated_amount ?? null,
        unit: item.unit ?? null,
      })),
      instructions: aiInstructions,
    });
    setLoading(false);

    if (result.error || !result.data) {
      setError(result.error ?? "Could not structure that inventory recording.");
      return;
    }

    const structuredRows = createRows(result.data.items, currentItems);
    const likelyRows = structuredRows.filter(isLikelyKitchenItem);
    const questionableRows = structuredRows.filter(
      (row) => !isLikelyKitchenItem(row),
    );
    setRows(likelyRows);
    setPotentialRows([
      ...questionableRows.map((row) => ({
        ...row,
        conflicts: [
          ...row.conflicts,
          {
            type: "other" as const,
            message: "This may not be a kitchen or food item.",
            existing_value: null,
            spoken_value: row.item_name,
          },
        ],
      })),
      ...createRows(result.data.potential_errors, currentItems),
    ]);
    setShowPotentialErrors(false);
    setReviewed(true);
  }

  function updateRow(id: string, patch: Partial<ReviewRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function removePotentialRow(id: string) {
    setPotentialRows((current) => current.filter((row) => row.id !== id));
  }

  function approvePotentialRow(row: ReviewRow) {
    setRows((current) => [
      ...current,
      {
        ...row,
        id: `approved-${row.id}`,
        action: row.matched_existing_id ? "update" : "add",
      },
    ]);
    removePotentialRow(row.id);
  }

  async function saveRows() {
    setSaving(true);
    setError(null);
    const savedItems: KitchenInventoryItem[] = [];

    for (const row of rows) {
      if (row.action === "ignore") continue;

      const brand = row.brand?.trim() || null;
      const amount = Number(row.quantity);
      const quantity = Number.isFinite(amount) && amount > 0 ? amount : 1;
      const unit = normalizeVoiceUnit(row.unit) || "unit";
      const displayName = displayNameForRow(row);

      if (row.action === "update" && row.matched_existing_id) {
        const result = await updateInventoryItemAction(
          row.matched_existing_id,
          {
            displayName,
            label: brand,
            estimatedAmount: quantity,
            unit,
          },
        );
        if (result.error || !result.data) {
          setError(result.error ?? `Could not update ${row.item_name}.`);
          setSaving(false);
          return;
        }
        savedItems.push(result.data);
        continue;
      }

      const result = await addInventoryItemAction(row.item_name, {
        displayName,
        label: brand ?? undefined,
        estimatedAmount: quantity,
        unit,
      });
      if (result.error || !result.data) {
        setError(result.error ?? `Could not add ${row.item_name}.`);
        setSaving(false);
        return;
      }
      savedItems.push(result.data);
    }

    onSaved(savedItems);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 sm:items-center sm:justify-center">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-outline-variant/30 bg-white px-5 py-4">
          <div>
            <p className="text-label-sm uppercase tracking-widest text-primary">
              Inventory fill
            </p>
            <h2 className="mt-1 text-xl font-bold text-on-surface">
              Voice inventory
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-container text-outline"
            aria-label="Close voice inventory"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-on-surface">
                  {sessionStatus}
                </p>
                <p className="mt-1 text-xs text-outline">
                  Say item, brand, and quantity. Review structures the final
                  transcript.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (recording) {
                      void stopRecording();
                    } else {
                      void startRecording();
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                    recording
                      ? "bg-error-container text-on-error-container"
                      : "bg-primary text-on-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {recording ? "stop" : "mic"}
                  </span>
                  {recording ? "Stop" : "Record"}
                </button>
                <button
                  type="button"
                  onClick={reviewTranscript}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-sm font-bold text-on-surface disabled:opacity-45"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    fact_check
                  </span>
                  {loading ? "Reviewing" : "Review"}
                </button>
                <button
                  type="button"
                  onClick={clearSession}
                  disabled={
                    recording ||
                    (!hasRecording && !transcript && rows.length === 0)
                  }
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-outline disabled:opacity-45"
                  aria-label="Clear voice inventory session"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    refresh
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="flex h-14 flex-1 items-center justify-center gap-1 rounded-2xl bg-white px-4">
                {Array.from({ length: 12 }).map((_, index) => (
                  <span
                    key={index}
                    className={`w-1.5 rounded-full bg-primary ${
                      voiceLevel > 0.04 ? "opacity-100" : "opacity-30"
                    }`}
                    style={{
                      height: recording
                        ? `${8 + voiceLevel * (16 + ((index * 7) % 26))}px`
                        : "10px",
                    }}
                  />
                ))}
              </div>
              <div className="w-16 text-right font-mono text-sm font-bold text-on-surface">
                {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
                {String(elapsed % 60).padStart(2, "0")}
              </div>
            </div>
            <p className="mt-2 text-xs text-outline">
              {recording && !transcript
                ? voiceLevel > 0.04
                  ? "Mic is picking up sound. Waiting for words..."
                  : "No microphone signal yet."
                : transcript
                  ? "Words captured. You can record more or review now."
                  : hasRecording
                    ? "Audio captured. Review will transcribe it."
                    : "Review stays available so a failed attempt does not reset the session."}
            </p>
            {speechNotice ? (
              <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs text-outline">
                {speechNotice}
              </p>
            ) : null}

            <label className="mt-4 block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-outline">
                AI notes
              </span>
              <textarea
                value={aiInstructions}
                onChange={(event) => setAiInstructions(event.target.value)}
                placeholder="Optional: e.g. treat Santino as a brand, cooking oil as the item, prefer kg when I say kilo."
                rows={2}
                className="mt-1 w-full resize-none rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          </section>

          {error ? (
            <div className="rounded-xl bg-error-container/40 px-3 py-2 text-sm text-on-error-container">
              {error}
            </div>
          ) : null}

          {reviewed && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-on-surface">
                  Review items ({rows.length})
                </h3>
                <span className="text-xs font-semibold text-outline">
                  {acceptedCount} selected
                </span>
              </div>

              {rows.length === 0 ? (
                <p className="rounded-2xl bg-surface-container-low p-4 text-sm text-outline">
                  No inventory items were found in that recording.
                </p>
              ) : (
                <div className="space-y-3">
                  {rows.map((row) => {
                    const existing = row.matched_existing_id
                      ? existingById.get(row.matched_existing_id)
                      : undefined;
                    return (
                      <div
                        key={row.id}
                        className="rounded-2xl border border-outline-variant/30 p-3"
                      >
                        <div className="flex gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-container">
                            <IngredientImage name={row.item_name} size={48} />
                            <span className="hidden absolute inset-0 items-center justify-center text-outline">
                              <span className="material-symbols-outlined text-[20px]">
                                nutrition
                              </span>
                            </span>
                          </div>
                          <div className="grid flex-1 gap-2 sm:grid-cols-[1.2fr_1fr_0.7fr_0.8fr]">
                            <input
                              value={row.display_name}
                              onChange={(event) =>
                                updateRow(row.id, {
                                  display_name: event.target.value,
                                })
                              }
                              placeholder="Display name"
                              className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-semibold outline-none focus:border-primary sm:col-span-2"
                              aria-label="Display name"
                            />
                            <input
                              value={row.item_name}
                              onChange={(event) =>
                                updateRow(row.id, {
                                  item_name: event.target.value,
                                })
                              }
                              placeholder="Item"
                              className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                              aria-label="Item"
                            />
                            <input
                              value={row.brand ?? ""}
                              onChange={(event) =>
                                updateRow(row.id, {
                                  brand: event.target.value || null,
                                })
                              }
                              placeholder="Brand"
                              className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
                              aria-label="Brand"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={row.quantity}
                              onChange={(event) =>
                                updateRow(row.id, {
                                  quantity: Number(event.target.value),
                                })
                              }
                              className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                              aria-label="Quantity"
                            />
                            <select
                              value={row.unit}
                              onChange={(event) =>
                                updateRow(row.id, { unit: event.target.value })
                              }
                              className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                              aria-label="Unit"
                            >
                              {INVENTORY_UNIT_OPTIONS.map((unit) => (
                                <option key={unit} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-outline transition-colors hover:bg-error-container/40 hover:text-error"
                            aria-label={`Remove ${row.item_name}`}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              delete
                            </span>
                          </button>
                        </div>

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-xs text-outline">
                            {existing
                              ? `Existing: ${formatExisting(existing)}`
                              : row.notes[0] || "New inventory item"}
                          </div>
                          <select
                            value={row.action}
                            onChange={(event) =>
                              updateRow(row.id, {
                                action: event.target.value as ReviewAction,
                              })
                            }
                            className="rounded-full border border-outline-variant bg-white px-3 py-1.5 text-xs font-bold text-on-surface"
                            aria-label={`Action for ${row.item_name}`}
                          >
                            {row.matched_existing_id ? (
                              <option value="update">Update existing</option>
                            ) : null}
                            <option value="add">
                              {row.matched_existing_id
                                ? "Add separately"
                                : "Add new"}
                            </option>
                            <option value="ignore">Ignore</option>
                          </select>
                        </div>

                        {row.conflicts.length > 0 ? (
                          <div className="mt-3 space-y-1 rounded-xl bg-tertiary-container/40 px-3 py-2">
                            {row.conflicts.map((conflict, index) => (
                              <p
                                key={`${row.id}-${conflict.type}-${index}`}
                                className="text-xs text-on-tertiary-container"
                              >
                                {conflict.message}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {reviewed && potentialRows.length > 0 ? (
            <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low">
              <button
                type="button"
                onClick={() => setShowPotentialErrors((show) => !show)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                aria-expanded={showPotentialErrors}
              >
                <div>
                  <h3 className="text-sm font-bold text-on-surface">
                    Potential errors ({potentialRows.length})
                  </h3>
                  <p className="mt-0.5 text-xs text-outline">
                    Items that may not belong in kitchen inventory.
                  </p>
                </div>
                <span className="material-symbols-outlined text-[22px] text-outline">
                  {showPotentialErrors ? "expand_less" : "expand_more"}
                </span>
              </button>

              {showPotentialErrors ? (
                <div className="space-y-2 border-t border-outline-variant/30 p-3">
                  {potentialRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 rounded-xl bg-white p-3"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                        <IngredientImage name={row.item_name} size={40} />
                        <span className="hidden absolute inset-0 items-center justify-center text-outline">
                          <span className="material-symbols-outlined text-[18px]">
                            help
                          </span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-on-surface">
                          {row.display_name || row.item_name}
                        </p>
                        <p className="truncate text-xs text-outline">
                          {[
                            row.brand,
                            row.item_name,
                            `${row.quantity} ${row.unit}`.trim(),
                          ]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                        {row.conflicts[0]?.message ? (
                          <p className="mt-1 text-xs text-on-tertiary-container">
                            {row.conflicts[0].message}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => approvePotentialRow(row)}
                        className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-on-primary"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => removePotentialRow(row.id)}
                        className="grid h-9 w-9 place-items-center rounded-full text-outline transition-colors hover:bg-error-container/40 hover:text-error"
                        aria-label={`Delete ${row.item_name}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-outline-variant/30 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-bold text-outline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveRows}
            disabled={!reviewed || acceptedCount === 0 || saving}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-on-primary disabled:opacity-45"
          >
            {saving ? "Saving" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
