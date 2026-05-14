"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BaseRecipe, Cuisine, Tag } from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { RecipeCreateModal } from "@/components/recipes/recipe-create-modal";
import { RecipeCaptureModal } from "@/components/recipes/recipe-capture-modal";

export function CreateClient({
  cuisines,
  tags,
  openCaptureOnLoad = false,
  openRecipeOnLoad = false,
}: {
  cuisines: Cuisine[];
  tags: Tag[];
  openCaptureOnLoad?: boolean;
  openRecipeOnLoad?: boolean;
}) {
  const router = useRouter();
  const [showRecipeCreate, setShowRecipeCreate] = useState(openRecipeOnLoad);
  const [showCapture, setShowCapture] = useState(openCaptureOnLoad);

  useEffect(() => {
    if (openCaptureOnLoad || openRecipeOnLoad) {
      router.replace("/create", { scroll: false });
    }
  }, [openCaptureOnLoad, openRecipeOnLoad, router]);

  function closeRecipeCreate() {
    setShowRecipeCreate(false);
  }

  function closeCapture() {
    setShowCapture(false);
  }

  function handleRecipeCreated(_recipe: BaseRecipe) {
    setShowRecipeCreate(false);
    router.push("/recipes");
  }

  return (
    <AppShell topBarTitle="Create">
      <main className="mx-auto flex min-h-[calc(100dvh-132px)] max-w-3xl flex-col justify-center px-5 pb-32 pt-8 sm:px-6 lg:min-h-[calc(100dvh-64px)] lg:pb-10">
        <div className="space-y-3">
          <p className="text-label-sm uppercase tracking-[0.18em] text-primary">
            Add a recipe
          </p>
          <h1 className="text-[2.4rem] font-black leading-[0.98] text-on-surface sm:text-headline-lg">
            What are we making next?
          </h1>
          <p className="max-w-xl text-body-md text-on-surface-variant">
            Start from scratch, paste a source, or let Chef turn messy food
            ideas into a draft.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setShowRecipeCreate(true)}
            className="flex min-h-44 flex-col justify-between rounded-[1.6rem] bg-secondary-container p-5 text-left text-on-secondary-container shadow-sm transition-transform active:scale-[0.98]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/60">
              <span className="material-symbols-outlined text-[26px] leading-none">
                draw
              </span>
            </span>
            <span>
              <span className="block text-headline-sm">
                Create your own recipe
              </span>
              <span className="mt-2 block text-body-sm text-on-secondary-container/72">
                Build ingredients, steps, nutrition, and tags manually.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowCapture(true)}
            className="group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-[1.6rem] border border-outline-variant/35 bg-white p-5 text-left text-on-surface shadow-sm transition-transform active:scale-[0.98]"
          >
            <span className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary/10 transition-transform group-hover:scale-125" />
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-surface text-primary">
              <span className="material-symbols-outlined text-[26px] leading-none">
                add_link
              </span>
            </span>
            <span>
              <span className="block text-headline-sm">Capture a recipe</span>
              <span className="mt-2 block text-body-sm text-on-surface-variant">
                Paste a link or text and Chef will draft something reviewable.
              </span>
            </span>
          </button>
        </div>

        <p className="mt-5 text-xs text-outline">
          Prefer the old route?{" "}
          <Link href="/import" className="font-semibold text-primary">
            Open import directly
          </Link>
          .
        </p>
      </main>

      {showRecipeCreate && (
        <RecipeCreateModal
          cuisines={cuisines}
          tags={tags}
          onClose={closeRecipeCreate}
          onCreated={handleRecipeCreated}
        />
      )}

      {showCapture && <RecipeCaptureModal onClose={closeCapture} />}
    </AppShell>
  );
}
