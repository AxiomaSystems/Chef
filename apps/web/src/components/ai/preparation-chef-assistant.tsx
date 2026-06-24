"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { BaseRecipe, KitchenInventoryItem } from "@cart/shared";
import { askChefAction, type ChefChatMessage } from "@/app/ai-actions";
import { ChatMarkdown } from "@/components/ai/chat-markdown";
import type { CookingContext } from "@/lib/cooking-context";

const DEFAULT_PROMPTS = [
  "Explain this step more simply.",
  "What should I prep next?",
  "Can I substitute an ingredient here?",
  "How do I avoid messing this up?",
];

type PreparationChefAssistantProps = {
  recipe: BaseRecipe;
  currentStepNumber: number;
  currentStepText: string | null;
  checkedCount: number;
  cookingContext?: CookingContext;
  inventory: KitchenInventoryItem[];
  ingredientCompletion: number;
  started: boolean;
};

export function PreparationChefAssistant({
  recipe,
  currentStepNumber,
  currentStepText,
  checkedCount,
  cookingContext,
  inventory,
  ingredientCompletion,
  started,
}: PreparationChefAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChefChatMessage[]>([
    {
      role: "assistant",
      content: `I am looking at the full ${recipe.name} recipe. Ask about ingredients, steps, timing, substitutions, or how the whole flow comes together.`,
    },
  ]);
  const [followUps, setFollowUps] = useState<string[]>(DEFAULT_PROMPTS);
  const [safetyNotes, setSafetyNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  const recipeSummary = useMemo(
    () =>
      recipe.ingredients.map((ingredient) => ({
        name: ingredient.display_ingredient ?? ingredient.canonical_ingredient,
        amount: ingredient.amount,
        unit: ingredient.unit,
        preparation: ingredient.preparation ?? null,
        optional: ingredient.optional ?? false,
      })),
    [recipe.ingredients],
  );
  const recipeSteps = useMemo(
    () =>
      recipe.steps.map((step) => ({
        step: step.step,
        instruction: step.what_to_do,
      })),
    [recipe.steps],
  );

  function buildChatContext() {
    return {
      page: "recipe_preparation",
      surface: "recipe_preparation_assistant_modal",
      active_recipe: {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description ?? "",
        cuisine: recipe.cuisine.label,
        servings: recipe.servings,
        ingredient_count: recipe.ingredients.length,
        step_count: recipe.steps.length,
      },
      preparation_progress: {
        started,
        checked_ingredients: checkedCount,
        ingredient_completion_percent: ingredientCompletion,
      },
      user_cooking_context: cookingContext ?? null,
      hard_dietary_rules: cookingContext?.dietaryRules ?? [],
      available_inventory: inventory
        .filter(
          (item) =>
            item.review_status === "active" || item.review_status === "pending",
        )
        .slice(0, 80)
        .map((item) => ({
          id: item.id,
          display_name: item.display_name,
          canonical_name: item.ingredient?.canonical_name ?? null,
          category: item.ingredient?.category ?? null,
          estimated_amount: item.estimated_amount ?? null,
          unit: item.unit ?? null,
        })),
      full_ingredients: recipeSummary,
      full_steps: recipeSteps,
      current_position: currentStepText
        ? {
            step_number: currentStepNumber,
            step_instruction: currentStepText,
          }
        : null,
    };
  }

  function submit(messageOverride?: string) {
    const nextPrompt = (messageOverride ?? prompt).trim();
    if (!nextPrompt || isPending) return;

    const userMessage: ChefChatMessage = {
      role: "user",
      content: nextPrompt,
    };

    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setError(undefined);
    setSafetyNotes([]);

    startTransition(async () => {
      const result = await askChefAction({
        message: nextPrompt,
        history: messages.filter((message) => message.content.trim()).slice(-8),
        context: buildChatContext(),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.message ?? "I could not generate a useful answer.",
        },
      ]);
      setFollowUps(
        result.followUpPrompts?.length
          ? result.followUpPrompts
          : DEFAULT_PROMPTS,
      );
      setSafetyNotes(result.safetyNotes ?? []);
    });
  }

  return (
    <>
      <div className="rounded-[24px] border border-[#c0dedf] bg-[linear-gradient(135deg,#fff8ef_0%,#fff2e3_100%)] p-4 shadow-[0_12px_30px_rgba(244,121,13,0.12)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-fixed-dim">
              Chef AI
            </p>
            <h3 className="mt-1 text-title-md text-on-surface">
              Recipe-aware help when you actually need it
            </h3>
            <p className="mt-2 max-w-xl text-body-sm leading-6 text-on-surface-variant">
              Chef understands the full recipe, full ingredient list, full
              preparation flow, and where you currently are.
            </p>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-on-surface-variant">
              <span className="rounded-full bg-white/80 px-3 py-1">
                Step {currentStepNumber} of {recipe.steps.length}
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1">
                {checkedCount}/{recipe.ingredients.length} ingredients checked
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1">
                {ingredientCompletion}% ready
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="rounded-[20px] bg-primary px-5 py-3 text-center text-label-lg text-on-primary shadow-[0_10px_24px_rgba(244,121,13,0.25)] transition-opacity hover:opacity-90"
            >
              Ask Chef about this recipe
            </button>
          </div>
        </div>

        {currentStepText ? (
          <div className="mt-4 rounded-[20px] border border-white/70 bg-white/70 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">
              Current position
            </p>
            <p className="mt-2 text-sm leading-6 text-on-surface">
              {currentStepText}
            </p>
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-[69] bg-[rgba(40,24,12,0.18)] backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />

          <section className="fixed left-1/2 top-1/2 z-[70] flex h-[min(860px,calc(100vh-2.5rem))] w-[min(1220px,calc(100vw-2.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[36px] border border-[#c0dedf] bg-white shadow-[0_36px_120px_rgba(52,30,12,0.22)]">
            <div className="grid h-full min-h-0 w-full grid-cols-[340px_minmax(0,1fr)]">
              <aside className="flex min-h-0 flex-col border-r border-[#c0dedf] bg-[#fff8ef]">
                <div
                  className="border-b border-[#c0dedf] px-5 py-5"
                  style={{
                    background: "linear-gradient(160deg, #fff2e3, #fffdfa)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-fixed-dim text-on-primary-fixed shadow-sm">
                        <span className="material-symbols-outlined text-[22px]">
                          restaurant
                        </span>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-fixed-dim">
                          Chef AI
                        </p>
                        <h2 className="text-base font-semibold text-on-surface">
                          {recipe.name}
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-outline">
                          Contextual help for the preparation flow.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/60 bg-white hover:bg-surface-container-low"
                      aria-label="Close Chef recipe assistant"
                    >
                      <span className="material-symbols-outlined text-[19px]">
                        close
                      </span>
                    </button>
                  </div>

                  <div className="mt-4 rounded-[24px] border border-[#c0dedf] bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">
                      Current position
                    </p>
                    <p className="mt-2 text-sm font-semibold text-on-surface">
                      {currentStepText
                        ? `Step ${currentStepNumber}`
                        : "No active step"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-outline">
                      {currentStepText ??
                        "Start preparation to show where you are in the full recipe flow."}
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="rounded-[20px] border border-[#c0dedf] bg-white px-4 py-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">
                        Ingredients
                      </p>
                      <p className="mt-2 text-lg font-semibold text-on-surface">
                        {checkedCount}/{recipe.ingredients.length}
                      </p>
                      <p className="mt-1 text-xs text-outline">
                        Checked so far
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                  <div className="rounded-[24px] border border-[#c0dedf] bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-on-surface">
                      Recipe context
                    </p>
                    <div className="mt-3 space-y-2 text-xs leading-5 text-on-surface-variant">
                      <p>{recipe.cuisine.label}</p>
                      <p>{recipe.servings} servings</p>
                      <p>
                        {recipe.ingredients.length} ingredients available to
                        reference
                      </p>
                      <p>{recipe.steps.length} steps available to reference</p>
                      <p>{ingredientCompletion}% ingredient readiness</p>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[#c0dedf] bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-on-surface">
                      Try asking
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {DEFAULT_PROMPTS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => submit(item)}
                          disabled={isPending}
                          className="rounded-full border border-outline-variant/70 bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-primary-surface disabled:opacity-60"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>

              <div className="flex min-h-0 flex-col bg-white">
                <header className="border-b border-[#c0dedf] px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-fixed-dim">
                        Live conversation
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-on-surface">
                        Cooking help across the whole recipe
                      </h3>
                      <p className="mt-1 text-sm text-outline">
                        {recipe.name} · Step {currentStepNumber} ·{" "}
                        {ingredientCompletion}% ready
                      </p>
                    </div>

                    <div className="rounded-full border border-[#c0dedf] bg-[#fff8ef] px-3 py-1.5 text-xs font-medium text-primary-fixed-dim">
                      {started
                        ? "Preparation active"
                        : "Preparation not started"}
                    </div>
                  </div>
                </header>

                <div className="flex-1 space-y-4 overflow-y-auto bg-surface-container-low/40 px-6 py-6">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-[24px] px-4 py-3 text-[15px] leading-7 ${
                          message.role === "user"
                            ? "bg-primary-fixed-dim text-on-primary-fixed"
                            : "border border-outline-variant/50 bg-white text-on-surface shadow-sm"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <ChatMarkdown content={message.content} />
                        ) : (
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isPending ? (
                    <p className="w-fit rounded-[24px] border border-outline-variant/50 bg-white px-4 py-3 text-sm text-outline shadow-sm">
                      Thinking...
                    </p>
                  ) : null}
                </div>

                <div className="border-t border-outline-variant/40 bg-white px-6 py-5">
                  {error ? (
                    <p className="mb-3 rounded-2xl border border-error/20 bg-error-container/40 px-3 py-2 text-sm text-error">
                      {error}
                    </p>
                  ) : null}

                  {followUps.length > 0 ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {followUps.slice(0, 4).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => submit(item)}
                          disabled={isPending}
                          className="rounded-full border border-outline-variant/70 bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-primary-surface disabled:opacity-60"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <form
                    className="flex items-end gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submit();
                    }}
                  >
                    <textarea
                      ref={inputRef}
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      placeholder="Ask about this step, timing, substitutions, or what to prep next..."
                      rows={3}
                      className="min-h-16 flex-1 resize-none rounded-[24px] border border-outline-variant/70 bg-white px-4 py-3 text-sm text-on-surface outline-none focus:border-primary-fixed-dim"
                    />
                    <button
                      type="submit"
                      disabled={isPending || !prompt.trim()}
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed-dim text-on-primary-fixed hover:bg-primary-fixed disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Ask Chef"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        send
                      </span>
                    </button>
                  </form>

                  {safetyNotes.length > 0 ? (
                    <p className="mt-3 text-[11px] leading-4 text-outline">
                      {safetyNotes[0]}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
