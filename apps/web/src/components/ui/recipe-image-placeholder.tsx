"use client";

const PLACEHOLDER_VARIANTS = [
  {
    shell: "bg-[linear-gradient(135deg,#f4be6b_0%,#fff8ef_48%,#f4be6b_100%)]",
    glow: "bg-[radial-gradient(circle_at_top_left,rgba(244,121,13,0.30),transparent_42%)]",
    chip: "bg-[#fe8e17]/18 text-[#351800]",
    icon: "skillet",
  },
  {
    shell: "bg-[linear-gradient(135deg,#c0dedf_0%,#fff8ef_50%,#c0dedf_100%)]",
    glow: "bg-[radial-gradient(circle_at_top_left,rgba(60,154,158,0.26),transparent_42%)]",
    chip: "bg-[#3c9a9e]/18 text-[#073b3e]",
    icon: "nutrition",
  },
  {
    shell: "bg-[linear-gradient(135deg,#c0dedf_0%,#fff8ef_48%,#f4be6b_100%)]",
    glow: "bg-[radial-gradient(circle_at_top_left,rgba(60,154,158,0.24),transparent_40%)]",
    chip: "bg-[#3c9a9e]/16 text-[#073b3e]",
    icon: "restaurant",
  },
  {
    shell: "bg-[linear-gradient(135deg,#f4be6b_0%,#fff8ef_52%,#f4be6b_100%)]",
    glow: "bg-[radial-gradient(circle_at_top_left,rgba(244,190,107,0.24),transparent_40%)]",
    chip: "bg-[#3c9a9e]/16 text-[#123b3e]",
    icon: "grocery",
  },
];

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function initialsForTitle(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (words.length === 0) return "RC";
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

export function RecipeImagePlaceholder({
  className,
  title = "Recipe",
  seed,
}: {
  className?: string;
  title?: string;
  seed?: string;
}) {
  const normalizedSeed = (seed || title || "recipe").trim().toLowerCase();
  const variant =
    PLACEHOLDER_VARIANTS[
      hashSeed(normalizedSeed) % PLACEHOLDER_VARIANTS.length
    ];

  return (
    <div
      className={`relative overflow-hidden ${variant.shell} ${className ?? ""}`}
      aria-label={`${title} placeholder image`}
    >
      <div className={`absolute inset-0 ${variant.glow}`} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(26,28,26,0.14))]" />
      <div className="relative flex h-full w-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${variant.chip}`}
          >
            {initialsForTitle(title)}
          </span>
          <span className="material-symbols-outlined text-[30px] text-white/70">
            {variant.icon}
          </span>
        </div>
        <div className="max-w-[80%]">
          <p className="line-clamp-2 text-sm font-semibold text-[#132326]/85">
            {title}
          </p>
        </div>
      </div>
    </div>
  );
}
