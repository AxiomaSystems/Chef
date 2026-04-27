"use client";

const PLACEHOLDER_VARIANTS = [
  {
    shell:
      "bg-[linear-gradient(135deg,#f7e2c5_0%,#f4efe6_48%,#e7d7c4_100%)]",
    glow:
      "bg-[radial-gradient(circle_at_top_left,rgba(243,148,71,0.30),transparent_42%)]",
    chip: "bg-[#f39447]/18 text-[#6d391d]",
    icon: "skillet",
  },
  {
    shell:
      "bg-[linear-gradient(135deg,#dce9da_0%,#f4f0e6_50%,#cdddc3_100%)]",
    glow:
      "bg-[radial-gradient(circle_at_top_left,rgba(115,135,101,0.26),transparent_42%)]",
    chip: "bg-[#738765]/18 text-[#415238]",
    icon: "nutrition",
  },
  {
    shell:
      "bg-[linear-gradient(135deg,#f0d7cf_0%,#f6eee8_48%,#e8c2b4_100%)]",
    glow:
      "bg-[radial-gradient(circle_at_top_left,rgba(136,77,84,0.24),transparent_40%)]",
    chip: "bg-[#884d54]/16 text-[#5a2f35]",
    icon: "restaurant",
  },
  {
    shell:
      "bg-[linear-gradient(135deg,#efe3b3_0%,#f7f4e8_52%,#e7d9a0_100%)]",
    glow:
      "bg-[radial-gradient(circle_at_top_left,rgba(103,94,57,0.24),transparent_40%)]",
    chip: "bg-[#675e39]/16 text-[#4e4724]",
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
          <p className="line-clamp-2 text-sm font-semibold text-[#1a1c1a]/85">
            {title}
          </p>
        </div>
      </div>
    </div>
  );
}
