"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CreateVisionObservationRequest,
  KitchenInventoryItem,
  VisionDetection,
  VisionScanResponse,
} from "@cart/shared";
import {
  addVisionObservationToInventoryAction,
  createVisionObservationAction,
} from "./actions";

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

type VisionOcrSettings = {
  enabled: boolean;
  provider: "rapidocr";
  cacheEnabled: boolean;
  containerOnly: boolean;
};

const DEFAULT_VISION_DETECTOR = "yolo";
const DEFAULT_VISION_CLASSIFIER_RUN =
  "resnet18_ingredient_crops_5000_modal_frozen_v2";
const LIVE_SCAN_INTERVAL_MS = 1200;
const CLASSIFIER_RELABEL_MIN_CONFIDENCE = "0.85";
const OCR_SETTINGS_STORAGE_KEY = "chef_vision_ocr_settings_v1";
const DEFAULT_OCR_SETTINGS: VisionOcrSettings = {
  enabled: true,
  provider: "rapidocr",
  cacheEnabled: true,
  containerOnly: true,
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
  const liveScanAbortRef = useRef<AbortController | null>(null);
  const liveScanInFlightRef = useRef(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [result, setResult] = useState<VisionScanResponse | null>(null);
  const [expandedLabel, setExpandedLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [lastLiveScanAt, setLastLiveScanAt] = useState<number | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [focusedFrame, setFocusedFrame] = useState<{
    src: string;
    label: string;
  } | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<Record<string, string>>(
    {},
  );
  const [manualLabels, setManualLabels] = useState<Record<string, string>>({});
  const [ocrSettings, setOcrSettings] =
    useState<VisionOcrSettings>(DEFAULT_OCR_SETTINGS);
  const [discardedDetectionIds, setDiscardedDetectionIds] = useState<
    Record<string, true>
  >({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OCR_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<VisionOcrSettings>;
      setOcrSettings({
        enabled:
          typeof parsed.enabled === "boolean"
            ? parsed.enabled
            : DEFAULT_OCR_SETTINGS.enabled,
        provider: "rapidocr",
        cacheEnabled:
          typeof parsed.cacheEnabled === "boolean"
            ? parsed.cacheEnabled
            : DEFAULT_OCR_SETTINGS.cacheEnabled,
        containerOnly:
          typeof parsed.containerOnly === "boolean"
            ? parsed.containerOnly
            : DEFAULT_OCR_SETTINGS.containerOnly,
      });
    } catch {
      setOcrSettings(DEFAULT_OCR_SETTINGS);
    }
  }, []);

  function updateOcrSettings(next: VisionOcrSettings) {
    setOcrSettings(next);
    window.localStorage.setItem(OCR_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  }

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
      liveScanAbortRef.current?.abort();
      setIsLiveScanning(false);
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
  const detections = frames
    .flatMap((frame) => frame.detections)
    .filter((detection) => !discardedDetectionIds[detection.observation_id]);
  const detectionGroups = groupDetections(detections, labelForDetection);
  const trackableGroups = detectionGroups.filter(isTrackableGroup);
  const expandedGroup =
    detectionGroups.find((group) => group.label === expandedLabel) ??
    detectionGroups[0];
  const primaryAnnotatedFrame = frames.find(
    (frame) => frame.annotated_image_data_url,
  );
  const latestCameraFrame =
    mode === "camera" ? frames[frames.length - 1] : undefined;
  const expectedClassificationOff =
    result?.classification?.enabled === false &&
    result.classification.reason ===
      "Crop classification was not requested for this scan.";

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
    setFocusedFrame(null);
    setSelectedLabels({});
    setManualLabels({});
    setDiscardedDetectionIds({});
    setError(null);
    setLastLiveScanAt(null);
  }

  const getScanMedia = useCallback(async () => {
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
  }, [mode, preview?.file]);

  const submitScan = useCallback(
    async ({ live = false }: { live?: boolean } = {}) => {
      if (live && liveScanInFlightRef.current) return false;
      if (live) {
        liveScanInFlightRef.current = true;
      } else {
        setIsScanning(true);
      }

      const controller = new AbortController();
      if (live) liveScanAbortRef.current = controller;

      try {
        const media = await getScanMedia();

        if (!media) {
          setError("Choose a photo/video or allow camera access first.");
          return false;
        }

        const formData = new FormData();
        formData.set("media", media.blob, media.fileName);
        formData.set("media_kind", mode);
        formData.set("detector", DEFAULT_VISION_DETECTOR);
        formData.set("classifier_run", DEFAULT_VISION_CLASSIFIER_RUN);
        formData.set("classify_crops", "true");
        formData.set("classifier_relabel_enabled", "false");
        formData.set("classifier_top_k", "5");
        formData.set(
          "classifier_min_confidence",
          CLASSIFIER_RELABEL_MIN_CONFIDENCE,
        );
        formData.set("use_full_image_fallback", "false");
        formData.set("use_grid_fallback", "false");
        formData.set("grid_max_crops", "24");
        formData.set("grid_max_additions", "8");
        formData.set("ocr_enabled", String(ocrSettings.enabled));
        formData.set("ocr_provider", ocrSettings.provider);
        formData.set("ocr_cache_enabled", String(ocrSettings.cacheEnabled));
        formData.set("ocr_container_only", String(ocrSettings.containerOnly));
        formData.set("ocr_min_confidence", "0.35");
        formData.set("max_detections_per_frame", "20");
        formData.set("confidence_threshold", "0.2");
        formData.set("sampled_fps", "1");
        formData.set("max_frames", mode === "video" ? "12" : "1");

        const response = await fetch("/api/vision/analyze", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          setError(payload?.message ?? "Vision scan failed.");
          return false;
        }

        const nextResult = payload as VisionScanResponse;
        exposeVisionScanDebug(nextResult);
        setResult(nextResult);
        if (live) {
          setLastLiveScanAt(Date.now());
        }
        const firstLabel = nextResult.frames
          .flatMap((frame) => frame.detections)
          .find(Boolean)?.label;
        setExpandedLabel((current) => current ?? firstLabel ?? null);
        return true;
      } catch (scanError) {
        if ((scanError as DOMException).name !== "AbortError") {
          setError("Vision scan failed.");
        }
        return false;
      } finally {
        if (liveScanAbortRef.current === controller) {
          liveScanAbortRef.current = null;
        }
        if (live) {
          liveScanInFlightRef.current = false;
        } else {
          setIsScanning(false);
        }
      }
    },
    [getScanMedia, mode, ocrSettings],
  );

  useEffect(() => {
    if (!isLiveScanning || mode !== "camera" || preview?.kind !== "camera") {
      return undefined;
    }

    let stopped = false;
    let timer: number | null = null;

    async function scanLoop() {
      const ok = await submitScan({ live: true });
      if (stopped) return;
      if (!ok) {
        setIsLiveScanning(false);
        return;
      }
      timer = window.setTimeout(scanLoop, LIVE_SCAN_INTERVAL_MS);
    }

    void scanLoop();

    return () => {
      stopped = true;
      if (timer !== null) window.clearTimeout(timer);
      liveScanAbortRef.current?.abort();
      liveScanInFlightRef.current = false;
    };
  }, [isLiveScanning, mode, preview?.kind, submitScan]);

  function runScan() {
    setError(null);
    setResult(null);
    setExpandedLabel(null);
    setFocusedFrame(null);
    setSelectedLabels({});
    setManualLabels({});
    setDiscardedDetectionIds({});
    void submitScan();
  }

  function startLiveScan() {
    setError(null);
    setResult(null);
    setExpandedLabel(null);
    setFocusedFrame(null);
    setSelectedLabels({});
    setManualLabels({});
    setDiscardedDetectionIds({});
    setLastLiveScanAt(null);
    setIsLiveScanning(true);
  }

  function stopLiveScan() {
    liveScanAbortRef.current?.abort();
    setIsLiveScanning(false);
  }

  async function addDetection(
    detection: VisionDetection,
    label: string,
    key: string,
  ) {
    setAddingKey(key);
    const observation = await createVisionObservationAction(
      observationPayloadForDetection(detection, label),
    );

    if (!observation.data) {
      setAddingKey(null);
      setError(observation.error ?? "Failed to save vision observation.");
      return;
    }

    const response = await addVisionObservationToInventoryAction(
      observation.data.id,
      {
        display_name: label,
        canonical_name: label,
      },
    );
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

  function discardDetection(observationId: string) {
    setDiscardedDetectionIds((current) => ({
      ...current,
      [observationId]: true,
    }));
  }

  function discardGroup(group: DetectionGroup) {
    setDiscardedDetectionIds((current) => {
      const next = { ...current };
      for (const detection of group.detections) {
        next[detection.observation_id] = true;
      }
      return next;
    });
  }

  async function addGroup(group: DetectionGroup) {
    const key = `group-${group.label}`;
    setAddingKey(key);
    const primaryDetection = group.detections[0];
    const observation = await createVisionObservationAction(
      observationPayloadForDetection(primaryDetection, group.label, {
        group_count: group.count,
        grouped_observation_ids: group.detections.map(
          (detection) => detection.observation_id,
        ),
      }),
    );

    if (!observation.data) {
      setAddingKey(null);
      setError(observation.error ?? "Failed to save vision observation.");
      return;
    }

    const response = await addVisionObservationToInventoryAction(
      observation.data.id,
      {
        display_name: group.label,
        canonical_name: group.label,
        estimated_amount: group.count > 1 ? group.count : undefined,
        unit: group.count > 1 ? "ct" : undefined,
      },
    );
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
    for (const group of trackableGroups) {
      await addGroup(group);
    }
  }

  function handleClose() {
    liveScanAbortRef.current?.abort();
    setIsLiveScanning(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setFocusedFrame(null);
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
              {mode === "camera" ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 h-full w-full object-fill"
                  />
                  {latestCameraFrame && (
                    <CameraDetectionOverlay
                      detections={latestCameraFrame.detections}
                      labelForDetection={labelForDetection}
                    />
                  )}
                  <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                    {isLiveScanning
                      ? "Live scanning"
                      : lastLiveScanAt
                        ? "Live scan paused"
                        : "Camera ready"}
                  </div>
                </>
              ) : primaryAnnotatedFrame?.annotated_image_data_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={primaryAnnotatedFrame.annotated_image_data_url}
                    alt="Detected items with bounding boxes"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                  <button
                    onClick={() =>
                      setFocusedFrame({
                        src: primaryAnnotatedFrame.annotated_image_data_url!,
                        label: "Detected items",
                      })
                    }
                    className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white backdrop-blur hover:bg-black/85"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      open_in_full
                    </span>
                    Inspect
                  </button>
                </>
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

              <details className="rounded-2xl border border-outline-variant/40 bg-white px-4 py-3">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-outline">
                  Scan settings
                </summary>
                <div className="mt-3 space-y-3">
                  <label className="flex items-start gap-2 text-xs font-semibold text-on-surface">
                    <input
                      type="checkbox"
                      checked={ocrSettings.enabled}
                      onChange={(event) =>
                        updateOcrSettings({
                          ...ocrSettings,
                          enabled: event.target.checked,
                        })
                      }
                      className="mt-0.5"
                    />
                    <span>
                      Read text on containers
                      <span className="block pt-0.5 font-normal leading-4 text-outline">
                        Highlights label text and suggests names for bottles,
                        cans, jars, and packages.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-xs font-semibold text-on-surface">
                    <input
                      type="checkbox"
                      checked={ocrSettings.cacheEnabled}
                      disabled={!ocrSettings.enabled}
                      onChange={(event) =>
                        updateOcrSettings({
                          ...ocrSettings,
                          cacheEnabled: event.target.checked,
                        })
                      }
                      className="mt-0.5"
                    />
                    <span>Use local OCR cache</span>
                  </label>
                  <label className="flex items-start gap-2 text-xs font-semibold text-on-surface">
                    <input
                      type="checkbox"
                      checked={ocrSettings.containerOnly}
                      disabled={!ocrSettings.enabled}
                      onChange={(event) =>
                        updateOcrSettings({
                          ...ocrSettings,
                          containerOnly: event.target.checked,
                        })
                      }
                      className="mt-0.5"
                    />
                    <span>OCR containers only</span>
                  </label>
                </div>
              </details>

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

              {mode === "camera" ? (
                <button
                  onClick={isLiveScanning ? stopLiveScan : startLiveScan}
                  disabled={!preview}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 ${
                    isLiveScanning ? "bg-red-600" : "bg-on-surface"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      isLiveScanning ? "animate-spin" : ""
                    }`}
                  >
                    {isLiveScanning ? "stop_circle" : "play_circle"}
                  </span>
                  {isLiveScanning ? "Stop live scan" : "Start live scan"}
                </button>
              ) : (
                <button
                  onClick={runScan}
                  disabled={isScanning || !preview}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-on-surface py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      isScanning ? "animate-spin" : ""
                    }`}
                  >
                    {isScanning ? "refresh" : "center_focus_strong"}
                  </span>
                  {isScanning ? "Looking..." : "Find items"}
                </button>
              )}

              {result && (
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Visible objects" value={detections.length} />
                  <Metric label="Item types" value={detectionGroups.length} />
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              {mode === "camera" && result && (
                <p className="rounded-xl border border-outline-variant/50 bg-white px-3 py-2 text-xs font-semibold text-outline">
                  Stop the live scan to review containers, cans, bottles, and
                  anything generic before adding it.
                </p>
              )}
              {result?.classification &&
                result.classification.enabled === false &&
                !expectedClassificationOff && (
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
                {trackableGroups.length > 0 && (
                  <button
                    onClick={() => void addAllGroups()}
                    disabled={addingKey !== null}
                    className="w-full rounded-full bg-primary-fixed-dim px-4 py-2 text-xs font-bold text-on-primary-fixed disabled:opacity-60 sm:w-auto"
                  >
                    Add trackable items
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
                            {statusLabelForGroup(group)} · best{" "}
                            {bestConfidence(group)}%
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
                        <div className="flex items-center gap-2">
                          {isTrackableGroup(expandedGroup) ? (
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
                          ) : (
                            <span className="rounded-full border border-outline-variant/60 px-3 py-1.5 text-xs font-bold text-outline">
                              Review
                            </span>
                          )}
                          <button
                            onClick={() => discardGroup(expandedGroup)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 text-outline hover:bg-white"
                            aria-label={`Discard ${expandedGroup.label}`}
                            title={`Discard ${expandedGroup.label}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              close
                            </span>
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[22rem] overflow-y-auto divide-y divide-outline-variant/30">
                        {expandedGroup.detections.map((detection, index) => (
                          <div
                            key={detection.observation_id}
                            className="relative flex flex-col gap-3 px-4 py-3 pr-12 sm:flex-row sm:items-center"
                          >
                            <button
                              onClick={() =>
                                discardDetection(detection.observation_id)
                              }
                              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-outline hover:bg-surface-container"
                              aria-label={`Discard ${labelForDetection(
                                detection,
                              )}`}
                              title={`Discard ${labelForDetection(detection)}`}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                close
                              </span>
                            </button>
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
                                {detection.ocr?.suggested_label && (
                                  <p className="mt-1 truncate text-xs font-semibold text-cyan-700">
                                    OCR: {detection.ocr.suggested_label}
                                  </p>
                                )}
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
                                void addDetection(detection, label, key)
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
                          <button
                            onClick={() =>
                              setFocusedFrame({
                                src: frame.annotated_image_data_url!,
                                label: `Frame ${frame.frame_id}`,
                              })
                            }
                            className="block h-28 w-full"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={frame.annotated_image_data_url}
                              alt={`Frame ${frame.frame_id}`}
                              className="h-28 w-full object-contain"
                            />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {focusedFrame && (
        <div className="fixed inset-0 z-[60] bg-black/95 p-3 sm:p-6">
          <div className="flex h-full flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-white">
              <p className="text-sm font-bold">{focusedFrame.label}</p>
              <button
                onClick={() => setFocusedFrame(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Close inspected frame"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-xl bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={focusedFrame.src}
                alt={focusedFrame.label}
                className="mx-auto h-auto w-auto max-w-none object-contain"
              />
            </div>
          </div>
        </div>
      )}
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

function isTrackableGroup(group: DetectionGroup) {
  return group.detections.some(
    (detection) => detection.inventory_policy === "track",
  );
}

function statusLabelForGroup(group: DetectionGroup) {
  if (isTrackableGroup(group)) return "ready to add";
  if (
    group.detections.some(
      (detection) => detection.inventory_policy === "review",
    )
  ) {
    return "needs review";
  }
  return "ignored";
}

function titleForMode(mode: VisionMode) {
  if (mode === "camera") return "Live scan";
  if (mode === "video") return "Video upload";
  return "Photo upload";
}

function CameraDetectionOverlay({
  detections,
  labelForDetection,
}: {
  detections: VisionDetection[];
  labelForDetection: (detection: VisionDetection) => string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {detections.flatMap((detection) =>
        (detection.ocr?.text_boxes ?? []).map((box, index) => (
          <div
            key={`${detection.observation_id}-ocr-${index}`}
            className="absolute rounded-sm border-2 border-cyan-300 bg-cyan-300/15"
            style={{
              left: `${box.bbox.x * 100}%`,
              top: `${box.bbox.y * 100}%`,
              width: `${box.bbox.width * 100}%`,
              height: `${box.bbox.height * 100}%`,
            }}
          >
            <span className="absolute left-0 top-0 max-w-40 -translate-y-full truncate rounded-t-sm bg-cyan-300 px-1.5 py-0.5 text-[10px] font-bold text-black">
              {box.text}
            </span>
          </div>
        )),
      )}
      {detections.map((detection) => {
        const label = labelForDetection(detection);
        const review = detection.inventory_policy === "review";
        return (
          <div
            key={detection.observation_id}
            className={`absolute rounded-md border-2 ${
              review ? "border-amber-300" : "border-lime-300"
            }`}
            style={{
              left: `${detection.bbox.x * 100}%`,
              top: `${detection.bbox.y * 100}%`,
              width: `${detection.bbox.width * 100}%`,
              height: `${detection.bbox.height * 100}%`,
            }}
          >
            <span
              className={`absolute left-0 top-0 max-w-full -translate-y-full truncate rounded-t-md px-2 py-0.5 text-[11px] font-bold text-black ${
                review ? "bg-amber-300" : "bg-lime-300"
              }`}
            >
              {label} {Math.round(detection.confidence * 100)}%
            </span>
          </div>
        );
      })}
    </div>
  );
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
  const hasPredictions = predictionListForDetection(detection).length > 0;
  const hasSuggestions =
    hasPredictions || Boolean(detection.ocr?.suggested_label);
  const selected =
    selectedValue ??
    (hasPredictions ? "" : (options[0]?.value ?? detection.label));
  const isOther = selected === OTHER_VALUE;
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
        {hasPredictions && (
          <option value="" disabled>
            Classifier suggestions
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value={OTHER_VALUE}>Other</option>
      </select>
      {!hasSuggestions && (
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
  const ocrSuggestion = detection.ocr?.suggested_label?.trim();
  if (ocrSuggestion) {
    seen.add(ocrSuggestion.toLowerCase());
    options.push({
      value: ocrSuggestion,
      label: `OCR label: ${ocrSuggestion}`,
    });
  }

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
  }

  return options;
}

function observationPayloadForDetection(
  detection: VisionDetection,
  proposedName: string,
  extraRawPayload: Record<string, unknown> = {},
): CreateVisionObservationRequest {
  return {
    detected_label: detection.detector_label || detection.label,
    proposed_name: proposedName,
    detector_model: detection.class_id,
    confidence: detection.detector_confidence ?? detection.confidence,
    bbox: detection.bbox,
    crop_ref: detection.thumbnail_data_url
      ? detection.observation_id
      : undefined,
    raw_payload: {
      observation_id: detection.observation_id,
      class_id: detection.class_id,
      label: detection.label,
      category: detection.category,
      granularity: detection.granularity,
      inventory_policy: detection.inventory_policy,
      confidence: detection.confidence,
      detector_label: detection.detector_label,
      detector_confidence: detection.detector_confidence,
      classification_predictions: predictionListForDetection(detection),
      ...extraRawPayload,
    },
  };
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
      ocrSuggestion: detection.ocr?.suggested_label,
      ocrTextBoxes: detection.ocr?.text_boxes?.length ?? 0,
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
