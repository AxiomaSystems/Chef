"use client";

import { useEffect, useRef, useState } from "react";
import type { KitchenInventoryItem } from "@cart/shared";
import { addInventoryItemAction } from "./actions";

type ProductInfo = {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
};

export function CameraModal({
  mode,
  onClose,
  onAdded,
}: {
  mode: "photo" | "scan";
  onClose: () => void;
  onAdded?: (item: KitchenInventoryItem) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerStopRef = useRef<(() => void) | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }

        if (mode === "scan") {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const { DecodeHintType, BarcodeFormat } = await import("@zxing/library");

          const hints = new Map();
          hints.set(DecodeHintType.TRY_HARDER, true);
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.QR_CODE,
          ]);

          const reader = new BrowserMultiFormatReader(hints);

          const controls = await reader.decodeFromStream(
            stream,
            video ?? undefined,
            async (result, err) => {
              if (!mounted || err || !result) return;

              controls.stop();
              stream.getTracks().forEach((t) => t.stop());

              const barcode = result.getText();
              setLookingUp(true);

              try {
                const res = await fetch(
                  `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
                );
                const data = await res.json();

                if (data.status === 1 && data.product?.product_name) {
                  setProduct({
                    barcode,
                    name: data.product.product_name,
                    brand: data.product.brands || undefined,
                    imageUrl:
                      data.product.image_thumb_url ||
                      data.product.image_url ||
                      undefined,
                  });
                } else {
                  setProduct({ barcode, name: barcode });
                }
              } catch {
                setProduct({ barcode, name: barcode });
              } finally {
                setLookingUp(false);
              }
            },
          );

          scannerStopRef.current = () => controls.stop();
        }
      } catch {
        if (mounted)
          setError(
            "Camera access denied. Please allow camera access in your browser settings.",
          );
      }
    }

    start();

    return () => {
      mounted = false;
      scannerStopRef.current?.();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [mode]);

  function stopAll() {
    scannerStopRef.current?.();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  function handleCapture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    stopAll();
    setCaptured(true);
  }

  async function handleAddProduct() {
    if (!product) return;
    setAdding(true);
    setAddError(null);
    const result = await addInventoryItemAction(product.name);
    setAdding(false);
    if (result.error) {
      setAddError(result.error);
    } else if (result.data) {
      onAdded?.(result.data);
      stopAll();
      onClose();
    }
  }

  function handleClose() {
    stopAll();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <p className="font-semibold text-sm">
          {mode === "photo" ? "Add a photo" : "Scan barcode"}
        </p>
        <div className="w-10" />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">

        {error ? (
          <div className="text-center px-8 space-y-4">
            <span className="material-symbols-outlined text-[56px] text-white/40 block">no_photography</span>
            <p className="text-white/80 text-sm leading-6">{error}</p>
            <button
              onClick={handleClose}
              className="bg-white/10 text-white text-sm font-semibold px-6 py-2.5 rounded-full"
            >
              Go back
            </button>
          </div>

        ) : captured ? (
          <div className="text-center px-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-white text-[32px]">check</span>
            </div>
            <p className="text-white font-bold text-lg">Photo captured!</p>
            <p className="text-white/60 text-sm">AI ingredient detection coming soon.</p>
            <button
              onClick={handleClose}
              className="bg-white text-black font-semibold px-8 py-2.5 rounded-full text-sm"
            >
              Done
            </button>
          </div>

        ) : lookingUp ? (
          <div className="text-center px-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-white text-[32px] animate-pulse">barcode_scanner</span>
            </div>
            <p className="text-white font-semibold">Looking up product…</p>
          </div>

        ) : product ? (
          <div className="w-full max-w-sm mx-auto px-6 space-y-4">
            <div className="bg-white rounded-2xl overflow-hidden">
              {product.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-40 object-contain bg-gray-50 p-4"
                />
              )}
              <div className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-green-600 text-[20px]">check_circle</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-on-surface text-base leading-tight">{product.name}</p>
                  {product.brand && (
                    <p className="text-sm text-outline mt-0.5">{product.brand}</p>
                  )}
                  <p className="text-xs text-outline/60 mt-1 font-mono">{product.barcode}</p>
                </div>
              </div>
            </div>

            {addError && (
              <p className="text-red-400 text-sm text-center">{addError}</p>
            )}

            <button
              onClick={handleAddProduct}
              disabled={adding}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {adding ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                  Adding…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add to Inventory
                </>
              )}
            </button>

            <button
              onClick={handleClose}
              className="w-full text-white/50 text-sm py-2"
            >
              Cancel
            </button>
          </div>

        ) : (
          <>
            {/* Live camera feed — always rendered so videoRef is always attached */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {mode === "scan" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative w-72 h-44 z-10">
                  <div className="absolute inset-0 rounded-xl ring-2 ring-white/60" />
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-white rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-white rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-white rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-white rounded-br-xl" />
                  <div className="absolute left-2 right-2 h-0.5 bg-orange-400 animate-bounce" style={{ top: "50%" }} />
                </div>
                <p className="absolute bottom-28 text-white/70 text-sm z-10">
                  Point at a barcode to scan automatically
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Photo capture button */}
      {mode === "photo" && !error && !captured && (
        <div className="flex justify-center py-8">
          <button
            aria-label="Capture photo"
            onClick={handleCapture}
            style={{ width: 72, height: 72 }}
            className="rounded-full bg-white border-[5px] border-white/40 shadow-xl active:scale-95 transition-transform"
          />
        </div>
      )}

      {/* Scan status */}
      {mode === "scan" && !product && !lookingUp && !error && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-2 bg-white/10 px-5 py-2.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-white/80 text-sm font-medium">Scanning…</span>
          </div>
        </div>
      )}
    </div>
  );
}
