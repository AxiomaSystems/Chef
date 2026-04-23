"use client";

import type { BaseRecipe, Retailer } from "@cart/shared";
import {
  useActionState,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  submitDraftFlowAction,
  type DraftFlowActionState,
} from "@/app/home-actions";
import { RecipeImage } from "@/components/ui/recipe-image";

const INITIAL_STATE: DraftFlowActionState = {};

function getDietaryBadges(recipe: BaseRecipe) {
  return recipe.tags.filter((tag) => tag.kind === "dietary_badge").slice(0, 3);
}

function SubmitButton(props: {
  intent: "save" | "generate";
  label: string;
  tone?: "primary" | "secondary";
}) {
  return (
    <button
      type="submit"
      name="intent"
      value={props.intent}
      className={
        props.tone === "secondary"
          ? "inline-flex min-h-11 items-center justify-center rounded-full border border-[#d7c2b9] bg-[#faf9f6]/72 px-4 text-sm font-semibold text-[#1a1c1a] transition hover:bg-white"
          : "inline-flex min-h-11 items-center justify-center rounded-full bg-[#895032] px-4 text-sm font-semibold text-[#faf9f6] transition hover:bg-[#1a1c1a]"
      }
    >
      {props.label}
    </button>
  );
}

export function NewDraftOverlay(props: {
  open: boolean;
  recipes: BaseRecipe[];
  onClose: () => void;
  onCreated: (detail: { type: "draft" | "cart"; id: string }) => void;
  initialSelections?: Array<{ recipeId: string; quantity: number }>;
  initialName?: string;
  initialRetailer?: Retailer;
  mode?: "create" | "edit-draft" | "edit-cart";
  resourceId?: string;
}) {
  const {
    initialName = "",
    initialSelections = [],
    initialRetailer = "walmart",
    mode = "create",
    onClose,
    onCreated,
    open,
    recipes,
    resourceId,
  } = props;
  const router = useRouter();
  const [state, formAction] = useActionState(
    submitDraftFlowAction,
    INITIAL_STATE,
  );
  const [query, setQuery] = useState("");
  const [draftName, setDraftName] = useState(initialName);
  const [retailer, setRetailer] = useState<Retailer>(initialRetailer);
  const [showAllTags, setShowAllTags] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>(
    Object.fromEntries(
      initialSelections
        .filter((selection) => selection.recipeId)
        .map((selection) => [selection.recipeId, Math.max(1, selection.quantity)]),
    ),
  );
  const deferredQuery = useDeferredValue(query);
  const handledResourceRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !state.resourceType ||
      !state.resourceId ||
      handledResourceRef.current === `${state.resourceType}:${state.resourceId}`
    ) {
      return;
    }

    handledResourceRef.current = `${state.resourceType}:${state.resourceId}`;
    onClose();
    onCreated({
      type: state.resourceType,
      id: state.resourceId,
    });
    router.refresh();
  }, [onClose, onCreated, router, state.resourceId, state.resourceType]);

  const recipeLookup = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe])),
    [recipes],
  );

  const availableTags = useMemo(() => {
    const tagMap = new Map<string, string>();
    for (const recipe of recipes) {
      for (const tag of recipe.tags) {
        tagMap.set(tag.id, tag.name);
      }
    }

    return Array.from(tagMap.entries())
      .map(([id, name]) => ({ id, name }))
      .toSorted((left, right) => left.name.localeCompare(right.name));
  }, [recipes]);

  const visibleTags = showAllTags ? availableTags : availableTags.slice(0, 10);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredRecipes = useMemo(
    () =>
      recipes.filter((recipe) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          recipe.name.toLowerCase().includes(normalizedQuery) ||
          recipe.description?.toLowerCase().includes(normalizedQuery) ||
          recipe.cuisine.label.toLowerCase().includes(normalizedQuery) ||
          recipe.tags.some((tag) =>
            tag.name.toLowerCase().includes(normalizedQuery),
          );
        const matchesTag =
          selectedTag === null ||
          recipe.tags.some((tag) => tag.id === selectedTag);

        return matchesQuery && matchesTag;
      }),
    [normalizedQuery, recipes, selectedTag],
  );

  const selectedRecipes = Object.entries(selectedQuantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => ({
      recipe: recipeLookup.get(id),
      quantity,
    }))
    .filter(
      (
        entry,
      ): entry is {
        recipe: BaseRecipe;
        quantity: number;
      } => Boolean(entry.recipe),
    );

  if (!open) {
    return null;
  }

  const title =
    mode === "edit-cart"
      ? "Edit cart"
      : mode === "edit-draft"
        ? "Edit draft"
        : "Build cart";
  const helperText =
    mode === "edit-cart"
      ? "Adjust the name, retailer, and recipes, then save the cart."
      : mode === "edit-draft"
        ? "Adjust the draft or generate a cart once the selection is ready."
        : "Choose recipes, keep the selection visible, and generate a cart. Save stays here only when you want to keep the run incomplete.";
  const nameLabel = mode === "edit-draft" ? "Draft name" : "Cart name";
  const locationNote =
    retailer === "kroger"
      ? "Kroger search needs your shopping location in preferences."
      : retailer === "instacart"
        ? "Instacart creates a hosted shopping-list handoff for the selected ingredients."
      : null;
  const selectionPayload = JSON.stringify(
    selectedRecipes.map(({ recipe, quantity }) => ({
      recipe_id: recipe.id,
      quantity,
    })),
  );

  function toggleRecipe(recipeId: string) {
    setSelectedQuantities((current) => {
      const next = { ...current };
      if (next[recipeId]) {
        delete next[recipeId];
      } else {
        next[recipeId] = 1;
      }
      return next;
    });
  }

  function updateRecipeQuantity(recipeId: string, delta: number) {
    setSelectedQuantities((current) => {
      const currentQuantity = current[recipeId] ?? 0;
      const nextQuantity = currentQuantity + delta;
      const next = { ...current };
      if (nextQuantity <= 0) {
        delete next[recipeId];
      } else {
        next[recipeId] = nextQuantity;
      }
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(24,35,29,0.6)] p-4 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-[#d7c2b9] bg-[#faf9f6] shadow-[0_28px_90px_rgba(10,18,13,0.28)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#d7c2b9] px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-sans font-bold text-3xl leading-none text-[#1a1c1a]">
              {title}
            </h2>
            <p className="mt-2 text-sm text-[#85736c]">
              {helperText}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d7c2b9] bg-white/74 text-xl text-[#1a1c1a] transition hover:bg-white"
            aria-label="Close cart builder"
          >
            x
          </button>
        </div>

        <form
          action={formAction}
          className="grid min-h-0 flex-1 lg:grid-cols-[1.45fr_0.8fr]"
        >
          <section className="min-h-0 overflow-y-auto border-b border-[#d7c2b9] px-5 py-5 lg:border-b-0 lg:border-r lg:px-6">
            <div className="grid gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="block w-full max-w-xs">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#895032]">
                    {nameLabel}
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder="Weeknight dinner plan"
                    className="min-h-11 w-full rounded-2xl border border-[#d7c2b9] bg-white px-4 text-sm text-[#1a1c1a] outline-none transition placeholder:text-[#85736c]/72 focus:border-[#895032]"
                  />
                </label>

                <label className="block w-full max-w-[10rem]">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#895032]">
                    Retailer
                  </span>
                  <select
                    name="retailer"
                    value={retailer}
                    onChange={(event) => setRetailer(event.target.value as Retailer)}
                    className="min-h-11 w-full rounded-2xl border border-[#d7c2b9] bg-white px-4 text-sm text-[#1a1c1a] outline-none transition focus:border-[#895032]"
                  >
                    <option value="walmart">Walmart</option>
                    <option value="kroger">Kroger</option>
                    <option value="instacart">Instacart</option>
                  </select>
                </label>

                <label className="block w-full max-w-xl flex-1">
                  <span className="sr-only">Search recipes</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#85736c]/72">
                      Search
                    </span>
                    <input
                      suppressHydrationWarning
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search dishes"
                      className="min-h-11 w-full rounded-full border border-[#d7c2b9] bg-white pl-20 pr-4 text-sm text-[#1a1c1a] outline-none transition placeholder:text-[#85736c]/72 focus:border-[#895032]"
                    />
                  </div>
                </label>
              </div>

              {locationNote ? (
                <p className="text-sm text-[#85736c]">
                  {locationNote}
                </p>
              ) : null}

              {availableTags.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
                      selectedTag === null
                        ? "border-[#895032] bg-[#895032] text-[#faf9f6]"
                        : "border-[#d7c2b9] bg-[#faf9f6]/72 text-[#85736c] hover:bg-white"
                    }`}
                  >
                    All tags
                  </button>
                  {visibleTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        setSelectedTag((current) =>
                          current === tag.id ? null : tag.id,
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
                        selectedTag === tag.id
                          ? "border-[#895032] bg-[#895032]/14 text-[#1a1c1a]"
                          : "border-[#d7c2b9] bg-[#faf9f6]/72 text-[#85736c] hover:bg-white"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                  {availableTags.length > 10 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllTags((current) => !current)}
                      className="rounded-full border border-[#d7c2b9] bg-transparent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#895032] transition hover:bg-white"
                    >
                      {showAllTags ? "Show less" : "Show all"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredRecipes.map((recipe) => {
                  const selectedQuantity = selectedQuantities[recipe.id] ?? 0;
                  const selected = selectedQuantity > 0;
                  const badges = getDietaryBadges(recipe);

                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => toggleRecipe(recipe.id)}
                      className={`flex min-h-[13rem] flex-col overflow-hidden rounded-[1.3rem] border text-left transition ${
                        selected
                          ? "border-[#895032] bg-[#895032]/5 shadow-[0_10px_28px_rgba(23,50,36,0.12)]"
                          : "border-[#d7c2b9] bg-white/56 hover:border-[#895032]/28"
                      }`}
                    >
                      <RecipeImage
                        src={recipe.cover_image_url}
                        alt={recipe.name}
                        seed={recipe.id}
                        className="relative h-24 overflow-hidden border-b border-[#d7c2b9] bg-[#faf9f6]"
                        imgClassName="h-full w-full object-cover"
                      />

                      <div className="flex flex-1 flex-col p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#895032]">
                            {recipe.cuisine.label}
                          </div>
                          {selected ? (
                            <span className="rounded-full border border-[#895032] bg-[#895032]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#895032]">
                              x{selectedQuantity}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 font-sans font-bold text-[1.25rem] leading-[0.96] text-[#1a1c1a]">
                          {recipe.name}
                        </div>
                        <p className="mt-2 text-xs text-[#85736c]">
                          Servings: {recipe.servings}
                        </p>
                        <div className="mt-auto pt-3">
                          <div className="flex flex-wrap gap-1.5">
                            {badges.map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded-full border border-[#d7c2b9] bg-[rgba(250,246,236,0.92)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#895032]"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col bg-white/42 px-5 py-5 sm:px-6">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#895032]">
                Selected recipes
              </div>
              <div className="mt-2 font-sans font-bold text-3xl leading-none text-[#1a1c1a]">
                {selectedRecipes.reduce((sum, entry) => sum + entry.quantity, 0)}
              </div>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
              {selectedRecipes.length > 0 ? (
                <div className="grid gap-3">
                  {selectedRecipes.map(({ recipe, quantity }) => (
                    <div
                      key={recipe.id}
                      className="rounded-[1.2rem] border border-[#d7c2b9] bg-[#faf9f6]/76 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#895032]">
                            {recipe.cuisine.label}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-[#1a1c1a]">
                            {recipe.name}
                          </div>
                          <div className="mt-1 text-xs text-[#85736c]">
                            Servings: {recipe.servings} / Quantity: {quantity}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {getDietaryBadges(recipe).map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded-full border border-[#d7c2b9] bg-[rgba(250,246,236,0.92)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#895032]"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateRecipeQuantity(recipe.id, -1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d7c2b9] bg-white/80 text-sm font-semibold text-[#1a1c1a] transition hover:bg-white"
                            aria-label={`Decrease ${recipe.name} quantity`}
                          >
                            -
                          </button>
                          <span className="min-w-5 text-center text-sm font-semibold text-[#1a1c1a]">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateRecipeQuantity(recipe.id, 1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d7c2b9] bg-white/80 text-sm font-semibold text-[#1a1c1a] transition hover:bg-white"
                            aria-label={`Increase ${recipe.name} quantity`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-[#d7c2b9] bg-[#faf9f6]/54 px-4 py-5 text-sm leading-6 text-[#85736c]">
                  Select recipes on the left to start a cart.
                </div>
              )}
            </div>

            <input type="hidden" name="selections_json" value={selectionPayload} />
            {mode !== "create" ? (
              <>
                <input
                  type="hidden"
                  name="resource_type"
                  value={mode === "edit-cart" ? "cart" : "draft"}
                />
                <input type="hidden" name="resource_id" value={resourceId ?? ""} />
              </>
            ) : null}

            {state.error ? (
              <p className="mt-4 rounded-2xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/10 px-4 py-3 text-sm text-[#ba1a1a]">
                {state.error}
              </p>
            ) : null}

            {state.success ? (
              <p className="mt-4 rounded-2xl border border-[#895032]/14 bg-[#895032]/8 px-4 py-3 text-sm text-[#1a1c1a]">
                {state.success}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              {mode === "edit-cart" ? (
                <SubmitButton intent="save" label="Save cart" />
              ) : (
                <>
                  <SubmitButton intent="generate" label="Generate cart" />
                  <SubmitButton
                    intent="save"
                    label={mode === "edit-draft" ? "Save draft" : "Save draft"}
                    tone="secondary"
                  />
                </>
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-[#85736c]">
              {mode === "edit-cart"
                ? "Saving updates the current cart in place."
                : "Generate cart is the primary path. Save draft only keeps the selection around when you are not ready yet."}
            </p>
          </aside>
        </form>
      </div>
    </div>
  );
}
