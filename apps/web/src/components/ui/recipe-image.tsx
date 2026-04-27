"use client";

import { useEffect, useState } from "react";
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
  const [failed, setFailed] = useState(false);
  const normalizedSrc = src?.trim() || "";

  useEffect(() => {
    setFailed(false);
  }, [normalizedSrc]);

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
        onError={() => setFailed(true)}
      />
    </div>
  );
}
