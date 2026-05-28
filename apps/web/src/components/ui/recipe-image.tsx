"use client";

import { useState } from "react";
import { RecipeImagePlaceholder } from "./recipe-image-placeholder";

const KNOWN_MISMATCHED_IMAGE_IDS = new Set([
  "photo-1605478371310-a9f1e96b4ff4",
]);

function isKnownMismatchedImage(src: string) {
  for (const imageId of KNOWN_MISMATCHED_IMAGE_IDS) {
    if (src.includes(imageId)) return true;
  }
  return false;
}

export function RecipeImage({
  src,
  alt,
  className,
  imgClassName,
  seed,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  seed?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const normalizedSrc = src?.trim() || "";
  const failed = failedSrc === normalizedSrc;

  if (!normalizedSrc || failed || isKnownMismatchedImage(normalizedSrc)) {
    return (
      <RecipeImagePlaceholder
        className={className}
        title={alt}
        seed={seed ?? alt}
      />
    );
  }

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={normalizedSrc}
        alt={alt}
        className={imgClassName ?? "h-full w-full object-cover"}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        onError={() => setFailedSrc(normalizedSrc)}
      />
    </div>
  );
}
