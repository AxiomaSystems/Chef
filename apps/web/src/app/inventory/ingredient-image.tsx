"use client";

function ingredientImageUrl(name: string) {
  const slug = name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(slug)}-Small.png`;
}

export function IngredientImage({
  name,
  size,
}: {
  name: string;
  size: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ingredientImageUrl(name)}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover"
      onError={(event) => {
        const img = event.currentTarget;
        img.style.display = "none";
        const fallback = img.nextElementSibling as HTMLElement | null;
        if (fallback) fallback.style.display = "flex";
      }}
    />
  );
}
