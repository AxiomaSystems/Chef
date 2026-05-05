"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type {
  KitchenInventoryItem,
  VisionDetection,
  VisionScanResponse,
} from "@cart/shared";
import { addInventoryItemAction } from "./actions";

type VisionMode = "photo" | "video" | "camera";

type PreviewState = {
  file?: File;
  fileName?: string;
  url?: string;
  kind: "image" | "video" | "camera";
};

type DetectionGroup = {
  label: string;
  count: number;
  detections: VisionDetection[];
  thumbnail?: string;
};

export function VisionScanModal({
  mode,
  onClose,
  onAdded,
}: {
  mode: VisionMode;
  onClose: () => void;
  onAdded?: (item: KitchenInventoryItem) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [result, setResult] = useState<VisionScanResponse | null>(null);
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<Record<string, string>>(
    {},
  );
  const [manualLabels, setManualLabels] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (mode !== "camera") return undefined;

    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        setPreview({ kind: "camera" });
      } catch {
        setError("Camera access denied.");
      }
    }

    startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "camera" || preview?.kind !== "camera") return;

    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    void video.play().catch(() => {});
  }, [mode, preview?.kind]);

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview?.url]);

  const frames = result?.frames ?? [];
  const detections = frames.flatMap((frame) => frame.detections);
  const detectionGroups = groupDetections(detections, labelForDetection);
  const expandedGroup =
    detectionGroups.find((group) => group.label === expandedLabel) ??
    detectionGroups[0];
  const primaryAnnotatedFrame = frames.find(
    (frame) => frame.annotated_image_data_url,
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (preview?.url) URL.revokeObjectURL(preview.url);

    setPreview({
      file,
      fileName: file.name,
      url: URL.createObjectURL(file),
      kind: mode === "video" ? "video" : "image",
    });
    setResult(null);
    setExpandedLabel(null);
    setSelectedLabels({});
    setManualLabels({});
    setError(null);
  }

  async function getScanMedia() {
    if (preview?.file) {
      return {
        blob: preview.file,
        fileName: preview.file.name,
      };
    }

    if (mode !== "camera" || !videoRef.current) {
      return null;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );

    if (!blob) return null;

    return {
      blob,
      fileName: `camera-${Date.now()}.jpg`,
    };
  }

  function runScan() {
    setError(null);
    setResult(null);
    setExpandedLabel(null);
    setSelectedLabels({});
    setManualLabels({});
    startTransition(async () => {
      const media = await getScanMedia();

      if (!media) {
        setError("Choose a photo/video or allow camera access first.");
        return;
      }

      const formData = new FormData();
      formData.set("media", media.blob, media.fileName);
      formData.set("media_kind", mode);
      formData.set("detector", "yolo");
      formData.set("classify_crops", "true");
      formData.set("classifier_top_k", "5");
      formData.set("use_full_image_fallback", "false");
      formData.set("use_grid_fallback", "false");
      formData.set("grid_max_crops", "24");
      formData.set("grid_max_additions", "8");
      formData.set("max_detections_per_frame", "20");
      formData.set("confidence_threshold", "0.2");
      formData.set("sampled_fps", "1");
      formData.set("max_frames", mode === "video" ? "12" : "1");

      const response = await fetch("/api/vision/analyze", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.message ?? "Vision scan failed.");
        return;
      }

      const nextResult = payload as VisionScanResponse;
      exposeVisionScanDebug(nextResult);
      setResult(nextResult);
      const firstLabel = nextResult.frames
        .flatMap((frame) => frame.detections)
        .find(Boolean)?.label;
      setExpandedLabel(firstLabel ?? null);
    });
  }

  async function addDetection(label: string, key: string) {
    setAddingKey(key);
    const response = await addInventoryItemAction(label);
    setAddingKey(null);

    if (response.error) {
      setError(response.error);
      return;
    }

    if (response.data) {
      onAdded?.(response.data);
    }
  }

  function setDetectionChoice(observationId: string, value: string) {
    setSelectedLabels((current) => ({
      ...current,
      [observationId]: value,
    }));

    if (value !== OTHER_VALUE) {
      setExpandedLabel(value);
    }
  }

  function setManualLabel(observationId: string, value: string) {
    setManualLabels((current) => ({
      ...current,
      [observationId]: value,
    }));

    const trimmedValue = value.trim();
    if (trimmedValue) {
      setExpandedLabel(trimmedValue);
    }
  }

  function labelForDetection(detection: VisionDetection) {
    const selected = selectedLabels[detection.observation_id];
    if (selected === OTHER_VALUE) {
      return manualLabels[detection.observation_id]?.trim() || detection.label;
    }

    return selected?.trim() || detection.label;
  }

  async function addGroup(group: DetectionGroup) {
    const key = `group-${group.label}`;
    setAddingKey(key);
    const response = await addInventoryItemAction(group.label, {
      estimatedAmount: group.count > 1 ? group.count : undefined,
      unit: group.count > 1 ? "ct" : undefined,
    });
    setAddingKey(null);

    if (response.error) {
      setError(response.error);
      return;
    }

    if (response.data) {
      onAdded?.(response.data);
    }
  }

  async function addAllGroups() {
    for (const group of detectionGroups.filter(
      (entry) => entry.detections[0]?.inventory_policy === "track",
    )) {
      await addGroup(group);
    }
  }

  function handleClose() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/30 px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="font-bold text-on-surface">{titleForMode(mode)}</p>
            <p className="text-xs text-outline">Find what is in your kitchen</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <input
            ref={fileInputRef}
            type="file"
            accept={mode === "video" ? "video/*" : "image/*"}
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="relative flex aspect-[4/3] max-h-[56vh] min-h-0 w-full items-center justify-center overflow-hidden rounded-2xl bg-black sm:aspect-video lg:aspect-[4/3]">
              {primaryAnnotatedFrame?.annotated_image_data_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primaryAnnotatedFrame.annotated_image_data_url}
                  alt="Detected items with bounding boxes"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              ) : preview?.kind === "image" && preview.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain"
                />
              ) : preview?.kind === "video" && preview.url ? (
                <video
                  src={preview.url}
                  controls
                  className="absolute inset-0 h-full w-full object-contain"
                />
              ) : mode === "camera" ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white/80"
                >
                  Choose {mode === "photo" ? "photo" : "video"}
                </button>
              )}
            </div>

            <div className="min-w-0 space-y-3">
              <div className="rounded-2xl bg-surface-container px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-outline">
                  Kitchen scan
                </p>
                <p className="mt-1 text-sm font-semibold text-on-surface">
                  Pick your kitchen view
                </p>
                <p className="mt-1 text-xs text-outline leading-5">
                  Choose a photo, video, or live view. We will show the food we
                  found before adding anything to your pantry.
                </p>
              </div>

              {mode !== "camera" && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-outline-variant/50 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    upload
                  </span>
                  Select {mode === "photo" ? "photo" : "video"}
                </button>
              )}

              {preview?.fileName && (
                <div className="flex min-w-0 items-center gap-2 rounded-xl border border-outline-variant/40 px-3 py-2 text-xs text-outline">
                  <span className="material-symbols-outlined text-[16px]">
                    draft
                  </span>
                  <span className="truncate">{preview.fileName}</span>
                </div>
              )}

              <button
                onClick={runScan}
                disabled={isPending || (!preview && mode !== "camera")}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-on-surface py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    isPending ? "animate-spin" : ""
                  }`}
                >
                  {isPending ? "refresh" : "center_focus_strong"}
                </span>
                {isPending ? "Looking..." : "Find items"}
              </button>

              {result && (
                <div className="grid grid-cols-2 gap-2">
                  <Metric
                    label="Objects"
                    value={result.summary.detection_count}
                  />
                  <Metric label="Item types" value={detectionGroups.length} />
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              {result?.classification &&
                result.classification.enabled === false && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    Suggestions are unavailable:{" "}
                    {result.classification.reason ?? "classifier did not run"}
                  </p>
                )}
            </div>
          </div>

          {result && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-on-surface">Items found</p>
                  <p className="text-xs text-outline">
                    Check the items before adding them to your kitchen.
                  </p>
                </div>
                {detectionGroups.length > 0 && (
                  <button
                    onClick={() => void addAllGroups()}
                    disabled={addingKey !== null}
                    className="w-full rounded-full bg-primary-fixed-dim px-4 py-2 text-xs font-bold text-on-primary-fixed disabled:opacity-60 sm:w-auto"
                  >
                    Add everything shown
                  </button>
                )}
              </div>

              {detectionGroups.length === 0 ? (
                <p className="rounded-2xl border border-outline-variant/40 p-4 text-sm text-outline">
                  No detections.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="rounded-2xl border border-outline-variant/40 overflow-hidden divide-y divide-outline-variant/30">
                    {detectionGroups.map((group) => (
                      <button
                        key={group.label}
                        onClick={() => setExpandedLabel(group.label)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          expandedGroup?.label === group.label
                            ? "bg-primary-fixed-dim/30"
                            : "hover:bg-surface-container"
                        }`}
                      >
                        <DetectionThumb
                          src={group.thumbnail}
                          label={group.label}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base text-on-surface truncate">
                            {group.count}x {group.label}
                          </p>
                          <p className="text-xs text-outline">
                            best {bestConfidence(group)}%
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-outline">
                          chevron_right
                        </span>
                      </button>
                    ))}
                  </div>

                  {expandedGroup && (
                    <div className="min-w-0 overflow-hidden rounded-2xl border border-outline-variant/40">
                      <div className="flex flex-col gap-3 bg-surface-container px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-bold text-base text-on-surface">
                            {expandedGroup.count}x {expandedGroup.label}
                          </p>
                          <p className="text-xs text-outline">
                            Check each item we found
                          </p>
                        </div>
                        <button
                          onClick={() => void addGroup(expandedGroup)}
                          disabled={
                            addingKey === `group-${expandedGroup.label}`
                          }
                          className="rounded-full bg-primary-fixed-dim px-3 py-1.5 text-xs font-bold text-on-primary-fixed disabled:opacity-60"
                        >
                          {addingKey === `group-${expandedGroup.label}`
                            ? "Adding"
                            : `Add ${expandedGroup.count}x`}
                        </button>
                      </div>
                      <div className="max-h-[22rem] overflow-y-auto divide-y divide-outline-variant/30">
                        {expandedGroup.detections.map((detection, index) => (
                          <div
                            key={detection.observation_id}
                            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <DetectionThumb
                                src={detection.thumbnail_data_url}
                                label={labelForDetection(detection)}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-semibold text-on-surface">
                                  {labelForDetection(detection)} #{index + 1}
                                </p>
                                <p className="text-xs text-outline">
                                  {Math.round(detection.confidence * 100)}%
                                  match
                                </p>
                              </div>
                            </div>
                            <DetectionAddControl
                              detection={detection}
                              addingKey={addingKey}
                              selectedValue={
                                selectedLabels[detection.observation_id]
                              }
                              manualValue={
                                manualLabels[detection.observation_id] ?? ""
                              }
                              onChoiceChange={(value) =>
                                setDetectionChoice(
                                  detection.observation_id,
                                  value,
                                )
                              }
                              onManualChange={(value) =>
                                setManualLabel(detection.observation_id, value)
                              }
                              onAdd={(label, key) =>
                                void addDetection(label, key)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {frames.filter((frame) => frame.annotated_image_data_url).length >
                1 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-outline">
                    Video moments
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {frames
                      .filter((frame) => frame.annotated_image_data_url)
                      .map((frame) => (
                        <div
                          key={frame.frame_id}
                          className="w-48 shrink-0 overflow-hidden rounded-xl bg-black"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={frame.annotated_image_data_url}
                            alt={`Frame ${frame.frame_id}`}
                            className="h-28 w-full object-contain"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function groupDetections(
  detections: VisionDetection[],
  labelForDetection: (detection: VisionDetection) => string,
): DetectionGroup[] {
  const groups = new Map<string, DetectionGroup>();

  for (const detection of detections) {
    const label = labelForDetection(detection);
    const existing = groups.get(label);

    if (existing) {
      existing.count += 1;
      existing.detections.push(detection);
      existing.thumbnail ??= detection.thumbnail_data_url;
    } else {
      groups.set(label, {
        label,
        count: 1,
        detections: [detection],
        thumbnail: detection.thumbnail_data_url,
      });
    }
  }

  return Array.from(groups.values()).sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.label.localeCompare(right.label);
  });
}

function bestConfidence(group: DetectionGroup) {
  return Math.max(
    ...group.detections.map((detection) =>
      Math.round(detection.confidence * 100),
    ),
  );
}

function titleForMode(mode: VisionMode) {
  if (mode === "camera") return "Live scan";
  if (mode === "video") return "Video upload";
  return "Photo upload";
}

function DetectionThumb({ src, label }: { src?: string; label: string }) {
  return (
    <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-container-low shrink-0 flex items-center justify-center">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span className="material-symbols-outlined text-[22px] text-outline">
          grocery
        </span>
      )}
    </div>
  );
}

function DetectionAddControl({
  detection,
  addingKey,
  selectedValue,
  manualValue,
  onChoiceChange,
  onManualChange,
  onAdd,
}: {
  detection: VisionDetection;
  addingKey: string | null;
  selectedValue?: string;
  manualValue: string;
  onChoiceChange: (value: string) => void;
  onManualChange: (value: string) => void;
  onAdd: (label: string, key: string) => void;
}) {
  const options = predictionOptions(detection);
  const selected = selectedValue ?? options[0]?.value ?? detection.label;
  const isOther = selected === OTHER_VALUE;
  const hasPredictions = predictionListForDetection(detection).length > 0;
  const addLabel = isOther ? manualValue.trim() : selected.trim();
  const addKey = `${detection.observation_id}-${addLabel || selected}`;
  const canAdd =
    addLabel.length > 0 &&
    (detection.inventory_policy === "track" ||
      isOther ||
      addLabel !== detection.label);

  const helperText = canAdd
    ? "Choose what goes into inventory."
    : "Name this item before adding it.";

  return (
    <div className="w-full shrink-0 space-y-2 sm:w-44">
      <select
        value={selected}
        onChange={(event) => onChoiceChange(event.target.value)}
        className="w-full rounded-xl border border-outline-variant/60 bg-white px-3 py-2 text-xs font-semibold text-on-surface"
        aria-label={`Choose item label for ${detection.label}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value={OTHER_VALUE}>Other</option>
      </select>
      {!hasPredictions && (
        <p className="text-[11px] leading-4 text-outline">
          Top suggestions did not come back for this item.
        </p>
      )}

      {isOther && (
        <input
          value={manualValue}
          onChange={(event) => onManualChange(event.target.value)}
          placeholder="Type item"
          className="w-full rounded-xl border border-outline-variant/60 bg-white px-3 py-2 text-xs font-semibold text-on-surface"
        />
      )}

      <button
        onClick={() => onAdd(addLabel, addKey)}
        disabled={!canAdd || addingKey === addKey}
        className="w-full rounded-full border border-outline-variant/60 px-3 py-1.5 text-xs font-bold text-on-surface disabled:opacity-50"
      >
        {addingKey === addKey ? "Adding" : "Add"}
      </button>
      <p className="text-[11px] leading-4 text-outline">{helperText}</p>
    </div>
  );
}

const OTHER_VALUE = "__other__";

type ClassificationPrediction = NonNullable<
  VisionDetection["classification_predictions"]
>[number];

type DetectionWithPredictionAliases = VisionDetection & {
  classificationPredictions?: ClassificationPrediction[];
  predictions?: ClassificationPrediction[];
  top_predictions?: ClassificationPrediction[];
};

function predictionListForDetection(
  detection: VisionDetection,
): ClassificationPrediction[] {
  const detectionWithAliases = detection as DetectionWithPredictionAliases;
  const predictionCandidates = [
    detection.classification_predictions,
    detectionWithAliases.classificationPredictions,
    detectionWithAliases.predictions,
    detectionWithAliases.top_predictions,
  ];

  return predictionCandidates.find((predictions) => predictions?.length) ?? [];
}

function predictionOptions(detection: VisionDetection) {
  const seen = new Set<string>();
  const options: Array<{ value: string; label: string }> = [];
  const predictions = predictionListForDetection(detection).slice(0, 5);

  for (const prediction of predictions) {
    const label = prediction.label.trim();
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;

    seen.add(key);
    options.push({
      value: label,
      label: `${label} ${Math.round(prediction.probability * 100)}%`,
    });
  }

  if (options.length === 0) {
    const label = detection.label.trim();
    if (label) {
      seen.add(label.toLowerCase());
      options.push({
        value: label,
        label,
      });
    }
  } else if (!seen.has(detection.label.toLowerCase())) {
    options.push({
      value: detection.label,
      label: detection.label,
    });
  }

  return options;
}

function exposeVisionScanDebug(result: VisionScanResponse) {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return;
  }

  const debugWindow = window as Window & {
    __chefLastVisionScan?: VisionScanResponse;
  };
  const detections = result.frames.flatMap((frame) => frame.detections);

  debugWindow.__chefLastVisionScan = result;
  console.info("[chef vision] scan response", {
    pipelineProvider: result.pipeline.provider,
    classification: result.classification,
    detectionCount: detections.length,
    predictionCounts: detections.map((detection) => ({
      label: detection.label,
      detectorLabel: detection.detector_label,
      predictions: predictionListForDetection(detection).map(
        (prediction) => prediction.label,
      ),
    })),
    raw: result,
  });
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-surface-container px-3 py-3">
      <p className="text-xl font-bold text-on-surface">{value}</p>
      <p className="text-xs text-outline">{label}</p>
    </div>
  );
}
