"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type {
  BaseRecipe,
  CaptureRecipePreview,
  Cuisine,
  Tag,
} from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { IMPORTED_RECIPE_DRAFT_STORAGE_KEY } from "@/lib/imported-recipe-draft";

const RecipeCreateModal = dynamic(
  () =>
    import("@/components/recipes/recipe-create-modal").then(
      (mod) => mod.RecipeCreateModal,
    ),
  {
    loading: () => (
      <div className="rounded-[2rem] border border-outline-variant/40 bg-background p-8 text-body-md text-on-surface-variant shadow-[0_24px_80px_rgba(46,30,15,0.12)]">
        Loading recipe builder...
      </div>
    ),
    ssr: false,
  },
);

export function NewRecipeClient({
  cuisines,
  tags,
  loadImportedDraft = false,
}: {
  cuisines: Cuisine[];
  tags: Tag[];
  loadImportedDraft?: boolean;
}) {
  const router = useRouter();
  const [initialDraft, setInitialDraft] = useState<CaptureRecipePreview | null>(
    null,
  );
  const [hasLoadedDraft, setHasLoadedDraft] = useState(!loadImportedDraft);
  const [missingImportedDraft, setMissingImportedDraft] = useState(false);

  useEffect(() => {
    if (!loadImportedDraft) {
      setHasLoadedDraft(true);
      return;
    }

    const raw = window.sessionStorage.getItem(
      IMPORTED_RECIPE_DRAFT_STORAGE_KEY,
    );
    if (!raw) {
      setMissingImportedDraft(true);
      setHasLoadedDraft(true);
      return;
    }

    try {
      setInitialDraft(JSON.parse(raw) as CaptureRecipePreview);
    } catch {
      setInitialDraft(null);
      setMissingImportedDraft(true);
    } finally {
      window.sessionStorage.removeItem(IMPORTED_RECIPE_DRAFT_STORAGE_KEY);
      setHasLoadedDraft(true);
    }
  }, [loadImportedDraft]);

  function handleCreated(recipe: BaseRecipe) {
    router.push(`/recipes/${recipe.id}`);
  }

  return (
    <AppShell topBarTitle="Create Recipe" hideCreateActions>
      <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-36 sm:px-6 sm:py-7 lg:py-10">
        <div className="mb-6 grid gap-3 sm:mb-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-label-sm uppercase tracking-[0.18em] text-primary">
              {initialDraft ? "Review import" : "New recipe"}
            </p>
            <h1 className="mt-2 max-w-xl text-[2.2rem] font-black leading-[0.96] text-on-surface sm:text-headline-lg">
              {initialDraft ? "Make Chef's draft yours." : "Build a recipe."}
            </h1>
          </div>
          <p className="max-w-2xl text-body-md leading-7 text-on-surface-variant lg:justify-self-end">
            {initialDraft
              ? "Chef filled the form from your capture. Review the ingredients, steps, image, and tags before saving it to your kitchen."
              : "Start with the basics, then fill ingredients and steps manually or ask Chef to draft the rest from the recipe name."}
          </p>
        </div>

        {missingImportedDraft && (
          <div className="mb-5 rounded-[1.4rem] border border-primary/20 bg-primary-surface px-5 py-4 text-body-sm text-on-surface">
            The imported draft was no longer available. Start a new import from
            the Recipes page, or build this recipe manually below.
          </div>
        )}

        {hasLoadedDraft ? (
          <RecipeCreateModal
            key={initialDraft ? "imported-draft" : "blank-recipe"}
            cuisines={cuisines}
            tags={tags}
            onClose={() => router.push("/recipes")}
            onCreated={handleCreated}
            initialDraft={initialDraft}
            presentation="page"
          />
        ) : (
          <div className="rounded-[2rem] border border-outline-variant/40 bg-background p-8 text-body-md text-on-surface-variant shadow-[0_24px_80px_rgba(46,30,15,0.12)]">
            Loading Chef&apos;s imported draft...
          </div>
        )}
      </main>
    </AppShell>
  );
}
