"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Cuisine } from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import {
  importRecipeFromUrlAction,
  type AiRecipeImportResult,
} from "@/app/ai-actions";
import {
  createRecipeAction,
  type CreateRecipePayload,
} from "@/app/home-actions";

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  generic: "Web",
};

const PLATFORM_ICONS: Record<string, string> = {
  youtube: "smart_display",
  instagram: "photo_camera",
  tiktok: "music_video",
  generic: "link",
};

export function ImportClient({ cuisines }: { cuisines: Cuisine[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [supplementalText, setSupplementalText] = useState("");
  const [imported, setImported] = useState<AiRecipeImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, startImport] = useTransition();
  const [isSaving, startSave] = useTransition();

  function importRecipe() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl || isImporting) return;
    setError(null);
    startImport(async () => {
      const result = await importRecipeFromUrlAction({
        url: trimmedUrl,
        supplementalText: supplementalText.trim() || undefined,
      });
      if (result.error ?? !result.result) {
        setError(result.error ?? "Could not import that link.");
        return;
      }
      setImported(result.result!);
    });
  }

  function saveRecipe() {
    if (!imported || isSaving) return;
    const recipe = imported.imported_recipe;

    const matched =
      cuisines.find(
        (c) => c.label.toLowerCase() === recipe.cuisine.toLowerCase(),
      ) ?? cuisines[0];

    if (!matched) {
      setError("No cuisines available to save the recipe.");
      return;
    }

    const payload: CreateRecipePayload = {
      name: recipe.name,
      cuisine_id: matched.id,
      servings: recipe.servings,
      description: recipe.description,
      ingredients: recipe.ingredients.map((i) => ({
        canonical_ingredient: i.canonical_ingredient,
        amount: i.amount,
        unit: i.unit,
        preparation: i.preparation ?? undefined,
        optional: i.optional,
      })),
      steps: recipe.steps,
      nutrition_data: recipe.nutrition_estimate ?? undefined,
    };

    startSave(async () => {
      const result = await createRecipeAction(payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/recipes");
    });
  }

  function reset() {
    setUrl("");
    setSupplementalText("");
    setImported(null);
    setError(null);
  }

  if (imported) {
    const recipe = imported.imported_recipe;
    const platformLabel = PLATFORM_LABELS[imported.platform] ?? "Web";
    const platformIcon = PLATFORM_ICONS[imported.platform] ?? "link";
    const nutrition = recipe.nutrition_estimate;

    return (
      <AppShell topBarTitle="Import Recipe">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Recipe imported
            </p>
            <h1 className="mt-1 text-2xl font-bold text-on-surface">
              {recipe.name}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-secondary-container/40 px-3 py-1 text-label-sm text-on-secondary-container">
                <span className="material-symbols-outlined text-[14px]">
                  {platformIcon}
                </span>
                {platformLabel}
                {imported.source_creator ? ` · ${imported.source_creator}` : ""}
              </span>
              <span className="rounded-full bg-surface-container-low px-3 py-1 text-label-sm text-on-surface-variant">
                {recipe.servings} servings
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="shrink-0 rounded-full border border-outline-variant/60 px-4 py-2 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            Start over
          </button>
        </div>

        {recipe.description && (
          <p className="mb-6 text-body-md text-on-surface-variant">
            {recipe.description}
          </p>
        )}

        {nutrition &&
          (nutrition.calories ??
            nutrition.protein_g ??
            nutrition.carbs_g ??
            nutrition.fat_g) && (
            <div className="mb-6 flex flex-wrap gap-3">
              {nutrition.calories && (
                <div className="rounded-2xl bg-[#fff2e2] px-4 py-3 text-center">
                  <p className="text-label-sm text-on-surface-variant">Calories</p>
                  <p className="text-lg font-bold text-primary">{nutrition.calories}</p>
                </div>
              )}
              {nutrition.protein_g && (
                <div className="rounded-2xl bg-[#fff9dc] px-4 py-3 text-center">
                  <p className="text-label-sm text-on-surface-variant">Protein</p>
                  <p className="text-lg font-bold text-secondary">{nutrition.protein_g}g</p>
                </div>
              )}
              {nutrition.carbs_g && (
                <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-center">
                  <p className="text-label-sm text-on-surface-variant">Carbs</p>
                  <p className="text-lg font-bold text-on-surface">{nutrition.carbs_g}g</p>
                </div>
              )}
              {nutrition.fat_g && (
                <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-center">
                  <p className="text-label-sm text-on-surface-variant">Fat</p>
                  <p className="text-lg font-bold text-on-surface">{nutrition.fat_g}g</p>
                </div>
              )}
            </div>
          )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-[24px] border border-outline-variant/20 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-label-lg font-semibold text-on-surface">
              Ingredients
              <span className="ml-2 text-label-sm font-normal text-outline">
                {recipe.ingredients.length} items
              </span>
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-body-sm text-on-surface"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                  <span>
                    <span className="font-medium">
                      {ingredient.amount} {ingredient.unit}
                    </span>{" "}
                    {ingredient.display_ingredient ??
                      ingredient.canonical_ingredient}
                    {ingredient.preparation
                      ? `, ${ingredient.preparation}`
                      : ""}
                    {ingredient.optional && (
                      <span className="ml-1 text-[10px] text-outline">
                        (optional)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[24px] border border-outline-variant/20 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-label-lg font-semibold text-on-surface">
              Steps
              <span className="ml-2 text-label-sm font-normal text-outline">
                {recipe.steps.length} steps
              </span>
            </h2>
            <ol className="space-y-3">
              {recipe.steps.map((step) => (
                <li key={step.step} className="flex gap-3 text-body-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-label-sm font-semibold text-primary">
                    {step.step}
                  </span>
                  <p className="text-on-surface-variant">{step.what_to_do}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-2xl border border-error/20 bg-error-container/30 px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}

        {imported.extraction_notes.length > 0 && (
          <div className="mt-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-outline">
              Import notes
            </p>
            <ul className="mt-1 space-y-1">
              {imported.extraction_notes.map((note, i) => (
                <li key={i} className="text-xs text-on-surface-variant">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={saveRecipe}
            disabled={isSaving}
            className="rounded-full bg-primary px-8 py-3 text-label-lg font-semibold text-on-primary shadow-[0_10px_24px_rgba(243,148,71,0.25)] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save to my Recipes"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-full px-5 py-3 text-label-lg text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            Discard
          </button>
        </div>
      </div>
      </AppShell>
    );
  }

  return (
    <AppShell topBarTitle="Import Recipe">
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fixed-dim text-on-primary-fixed shadow-sm">
          <span className="material-symbols-outlined text-[26px]">add_link</span>
        </div>
        <h1 className="text-2xl font-bold text-on-surface">Import a Recipe</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Paste a link from YouTube, TikTok, or Instagram and Chef will extract
          the recipe for you.
        </p>
      </div>

      <div className="rounded-[28px] border border-outline-variant/20 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { icon: "smart_display", label: "YouTube" },
            { icon: "music_video", label: "TikTok" },
            { icon: "photo_camera", label: "Instagram" },
            { icon: "link", label: "Any link" },
          ].map(({ icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface-container-low px-3 py-1.5 text-label-sm text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[14px]">{icon}</span>
              {label}
            </span>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label
              htmlFor="recipe-url"
              className="mb-1.5 block text-label-sm font-medium text-on-surface"
            >
              Recipe link
            </label>
            <input
              id="recipe-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  importRecipe();
                }
              }}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-body-md text-on-surface outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div>
            <label
              htmlFor="supplemental"
              className="mb-1.5 block text-label-sm font-medium text-on-surface"
            >
              Caption or transcript{" "}
              <span className="font-normal text-outline">(optional — helps with TikTok & Instagram)</span>
            </label>
            <textarea
              id="supplemental"
              value={supplementalText}
              onChange={(e) => setSupplementalText(e.target.value)}
              rows={4}
              placeholder="Paste the video caption, description, or transcript here…"
              className="w-full resize-none rounded-2xl border border-outline-variant/70 bg-white px-4 py-3 text-body-md text-on-surface outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {error && (
            <p className="rounded-2xl border border-error/20 bg-error-container/30 px-4 py-3 text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={importRecipe}
            disabled={!url.trim() || isImporting}
            className="w-full rounded-2xl bg-primary py-3.5 text-label-lg font-semibold text-on-primary shadow-[0_10px_24px_rgba(243,148,71,0.2)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isImporting ? "Importing…" : "Import Recipe"}
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-outline">
        YouTube works best. For TikTok and Instagram, pasting the caption or
        transcript improves accuracy.
      </p>
    </div>
    </AppShell>
  );
}
