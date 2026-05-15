"use client";

import { useState } from "react";
import { RecipeImagePlaceholder } from "./recipe-image-placeholder";

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

  if (!normalizedSrc || failed) {
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
