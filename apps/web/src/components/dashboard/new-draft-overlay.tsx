"use client";

import type { BaseRecipe } from "@cart/shared";
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

const INITIAL_STATE: DraftFlowActionState = {};

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
          ? "inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/72 px-4 text-sm font-semibold text-[color:var(--forest-strong)] transition hover:bg-white"
          : "inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--forest)] px-4 text-sm font-semibold text-[color:var(--paper)] transition hover:bg-[color:var(--forest-strong)]"
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
}) {
  const { onClose, onCreated, open, recipes } = props;
  const router = useRouter();
  const [state, formAction] = useActionState(
    submitDraftFlowAction,
    INITIAL_STATE,
  );
  const [query, setQuery] = useState("");
  const [draftName, setDraftName] = useState("");
  const [showAllTags, setShowAllTags] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
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

  const selectedRecipes = selectedRecipeIds
    .map((id) => recipeLookup.get(id))
    .filter((recipe): recipe is BaseRecipe => Boolean(recipe));

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(24,35,29,0.6)] p-4 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--paper)] shadow-[0_28px_90px_rgba(10,18,13,0.28)]">
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--line)] px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-3xl leading-none text-[color:var(--forest-strong)]">
              New draft
            </h2>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
              Choose recipes, keep the selection visible, then save a draft or
              generate a cart.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/74 text-xl text-[color:var(--forest-strong)] transition hover:bg-white"
            aria-label="Close draft builder"
          >
            ×
          </button>
        </div>

        <form
          action={formAction}
          className="grid min-h-0 flex-1 lg:grid-cols-[1.45fr_0.8fr]"
        >
          <section className="min-h-0 overflow-y-auto border-b border-[color:var(--line)] px-5 py-5 lg:border-b-0 lg:border-r lg:px-6">
            <div className="grid gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="block w-full max-w-xs">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--olive)]">
                    Draft name
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder="Weeknight dinner plan"
                    className="min-h-11 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 text-sm text-[color:var(--forest-strong)] outline-none transition placeholder:text-[color:var(--ink-soft)]/72 focus:border-[color:var(--olive)]"
                  />
                </label>

                <label className="block w-full max-w-xl flex-1">
                  <span className="sr-only">Search recipes</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[color:var(--ink-soft)]/72">
                      ⌕
                    </span>
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search dishes"
                      className="min-h-11 w-full rounded-full border border-[color:var(--line)] bg-white pl-10 pr-4 text-sm text-[color:var(--forest-strong)] outline-none transition placeholder:text-[color:var(--ink-soft)]/72 focus:border-[color:var(--olive)]"
                    />
                  </div>
                </label>
              </div>

              {availableTags.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
                      selectedTag === null
                        ? "border-[color:var(--forest)] bg-[color:var(--forest)] text-[color:var(--paper)]"
                        : "border-[color:var(--line)] bg-[color:var(--paper)]/72 text-[color:var(--ink-soft)] hover:bg-white"
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
                          ? "border-[color:var(--olive)] bg-[color:var(--olive)]/14 text-[color:var(--forest-strong)]"
                          : "border-[color:var(--line)] bg-[color:var(--paper)]/72 text-[color:var(--ink-soft)] hover:bg-white"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                  {availableTags.length > 10 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllTags((current) => !current)}
                      className="rounded-full border border-[color:var(--line)] bg-transparent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--olive)] transition hover:bg-white"
                    >
                      {showAllTags ? "Show less" : "Show all"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredRecipes.map((recipe) => {
                  const selected = selectedRecipeIds.includes(recipe.id);

                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() =>
                        setSelectedRecipeIds((current) =>
                          current.includes(recipe.id)
                            ? current.filter((id) => id !== recipe.id)
                            : [...current, recipe.id],
                        )
                      }
                      className={`flex min-h-[14rem] flex-col overflow-hidden rounded-[1.3rem] border text-left transition ${
                        selected
                          ? "border-[color:var(--forest)] bg-[color:var(--forest)]/5 shadow-[0_10px_28px_rgba(23,50,36,0.12)]"
                          : "border-[color:var(--line)] bg-white/56 hover:border-[color:var(--olive)]/28"
                      }`}
                    >
                      {recipe.cover_image_url ? (
                        <div className="relative h-24 overflow-hidden border-b border-[color:var(--line)] bg-[color:var(--paper)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={recipe.cover_image_url}
                            alt={recipe.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="relative h-24 overflow-hidden border-b border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(115,135,101,0.12),rgba(245,240,228,0.42)),radial-gradient(circle_at_top_left,rgba(161,77,49,0.12),transparent_34%)]" />
                      )}

                      <div className="flex flex-1 flex-col p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                          {recipe.cuisine.label}
                        </div>
                        <div className="mt-2 font-display text-[1.25rem] leading-[0.96] text-[color:var(--forest-strong)]">
                          {recipe.name}
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[color:var(--ink-soft)]">
                          {recipe.description?.trim() || "Ready for planning."}
                        </p>
                        <div className="mt-auto pt-3">
                          <div className="flex flex-wrap gap-1.5">
                            {recipe.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded-full border border-[color:var(--olive)]/18 bg-[color:var(--olive)]/8 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--forest-strong)]"
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
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--olive)]">
                Selected recipes
              </div>
              <div className="mt-2 font-display text-3xl leading-none text-[color:var(--forest-strong)]">
                {selectedRecipes.length}
              </div>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
              {selectedRecipes.length > 0 ? (
                <div className="grid gap-3">
                  {selectedRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="rounded-[1.2rem] border border-[color:var(--line)] bg-[color:var(--paper)]/76 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--olive)]">
                            {recipe.cuisine.label}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-[color:var(--forest-strong)]">
                            {recipe.name}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRecipeIds((current) =>
                              current.filter((id) => id !== recipe.id),
                            )
                          }
                          className="text-sm text-[color:var(--ink-soft)] transition hover:text-[color:var(--forest-strong)]"
                          aria-label={`Remove ${recipe.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-[color:var(--line)] bg-[color:var(--paper)]/54 px-4 py-5 text-sm leading-6 text-[color:var(--ink-soft)]">
                  Select recipes on the left to build the draft.
                </div>
              )}
            </div>

            {selectedRecipeIds.map((id) => (
              <input key={id} type="hidden" name="recipe_ids" value={id} />
            ))}

            {state.error ? (
              <p className="mt-4 rounded-2xl border border-[color:var(--clay)]/20 bg-[color:var(--clay)]/10 px-4 py-3 text-sm text-[color:var(--clay)]">
                {state.error}
              </p>
            ) : null}

            {state.success ? (
              <p className="mt-4 rounded-2xl border border-[color:var(--forest)]/14 bg-[color:var(--forest)]/8 px-4 py-3 text-sm text-[color:var(--forest-strong)]">
                {state.success}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <SubmitButton intent="save" label="Save" tone="secondary" />
              <SubmitButton intent="generate" label="Generate cart" />
            </div>
            <p className="mt-3 text-xs leading-5 text-[color:var(--ink-soft)]">
              Save creates a draft. Generate cart creates the cart immediately
              using the same name when provided.
            </p>
          </aside>
        </form>
      </div>
    </div>
  );
}
