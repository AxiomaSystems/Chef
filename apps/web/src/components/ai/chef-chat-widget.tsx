"use client";

import { usePathname } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { BaseRecipe } from "@cart/shared";
import {
  askChefAction,
  fetchUserRecipesAction,
  generateMealsAction,
  importRecipeFromUrlAction,
  type AiRecipeImportResult,
  type AiRecipePreview,
  type ChefChatMessage,
} from "@/app/ai-actions";
import { ChatMarkdown } from "@/components/ai/chat-markdown";

const STARTER_PROMPTS = [
  "What can I cook with what I have?",
  "Make this meal cheaper.",
  "Plan high-protein dinners for the week.",
];

const HANDS_FREE_PROMPTS = [
  "Guide me one step at a time.",
  "Repeat the last step.",
  "What can I prep while I wait?",
];

type WidgetContext =
  | { type: "none" }
  | {
      type: "imported";
      name: string;
      detail: string;
      url: string;
      platform: "youtube" | "instagram" | "tiktok" | "generic";
      recipe: AiRecipePreview;
    }
  | {
      type: "recipe";
      name: string;
      detail: string;
      recipe: BaseRecipe;
    }
  | {
      type: "generated";
      name: string;
      detail: string;
      recipe: AiRecipePreview;
    };

export function ChefChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChefChatMessage[]>([
    {
      role: "assistant",
      content:
        "I am right here while you cook. Paste a creator link, pin one of your recipes, or ask for meal ideas.",
    },
  ]);
  const [followUps, setFollowUps] = useState<string[]>(STARTER_PROMPTS);
  const [safetyNotes, setSafetyNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [context, setContext] = useState<WidgetContext>({ type: "none" });
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkSupplementalText, setLinkSupplementalText] = useState("");
  const [showPlanner, setShowPlanner] = useState(false);
  const [mealPrompt, setMealPrompt] = useState("");
  const [mealStyle, setMealStyle] = useState<
    "standard" | "inventory_first" | "high_protein" | "meal_prep" | "quick"
  >("standard");
  const [generatedRecipes, setGeneratedRecipes] = useState<AiRecipePreview[]>(
    [],
  );
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [savedRecipes, setSavedRecipes] = useState<BaseRecipe[]>([]);
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, startGeneration] = useTransition();
  const [isImporting, startImport] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function pushAssistantMessage(content: string) {
    setMessages((current) => [...current, { role: "assistant", content }]);
  }

  function buildChatContext() {
    return {
      page: pathname,
      surface: isExpanded
        ? "global_chef_chat_widget_expanded"
        : "global_chef_chat_widget",
      hands_free_mode: handsFreeMode,
      selected_context_type: context.type,
      selected_context_name: context.type === "none" ? null : context.name,
      selected_context_detail: context.type === "none" ? null : context.detail,
      selected_recipe:
        context.type === "recipe"
          ? {
              id: context.recipe.id,
              name: context.recipe.name,
              cuisine: context.recipe.cuisine.label,
              description: context.recipe.description ?? "",
              servings: context.recipe.servings,
              ingredients: context.recipe.ingredients.map((ingredient) => ({
                name:
                  ingredient.display_ingredient ??
                  ingredient.canonical_ingredient,
                canonical_ingredient: ingredient.canonical_ingredient,
                amount: ingredient.amount,
                unit: ingredient.unit,
                preparation: ingredient.preparation ?? null,
                optional: ingredient.optional ?? false,
              })),
              steps: context.recipe.steps.map((step) => ({
                step: step.step,
                instruction: step.what_to_do,
              })),
              nutrition_data: context.recipe.nutrition_data ?? null,
              tags: context.recipe.tags.map((tag) => tag.name),
            }
          : null,
      generated_recipe:
        context.type === "generated" || context.type === "imported"
          ? context.recipe
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
        message: handsFreeMode
          ? `${nextPrompt}\n\nRespond briefly and in a hands-free cooking style.`
          : nextPrompt,
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
          : handsFreeMode
            ? HANDS_FREE_PROMPTS
            : STARTER_PROMPTS,
      );
      setSafetyNotes(result.safetyNotes ?? []);
    });
  }

  function applyImportedRecipe(imported: AiRecipeImportResult) {
    setContext({
      type: "imported",
      name: imported.imported_recipe.name,
      detail: imported.source_creator ?? imported.platform,
      url: imported.source_url,
      platform: imported.platform,
      recipe: imported.imported_recipe,
    });
    setShowLinkInput(false);
    setLinkUrl("");
    setLinkSupplementalText("");
    setGeneratedRecipes([]);
    setGeneratedSummary("");
    pushAssistantMessage(
      `Imported ${imported.imported_recipe.name} from ${
        imported.source_creator ?? imported.platform
      }. I can summarize it, adapt it, scale it, or turn it into a cooking plan.`,
    );
    setFollowUps([
      "Summarize this recipe.",
      "What ingredients will I need?",
      "Make this easier for a weeknight.",
      "Turn this into a step-by-step cooking plan.",
    ]);
  }

  function importLink() {
    const url = linkUrl.trim();
    if (!url || isImporting) return;

    setError(undefined);
    startImport(async () => {
      const result = await importRecipeFromUrlAction({
        url,
        supplementalText: linkSupplementalText,
      });

      if (result.error || !result.result) {
        setError(result.error ?? "Preppie could not import that link.");
        return;
      }

      applyImportedRecipe(result.result);
    });
  }

  function openRecipePicker() {
    if (loadingRecipes || isPending) return;

    setRecipePickerOpen(true);

    if (savedRecipes.length > 0) return;

    setLoadingRecipes(true);
    startTransition(async () => {
      const result = await fetchUserRecipesAction();
      setLoadingRecipes(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSavedRecipes(result.recipes ?? []);
    });
  }

  function selectRecipe(recipe: BaseRecipe) {
    setContext({
      type: "recipe",
      name: recipe.name,
      detail: `${recipe.servings} servings`,
      recipe,
    });
    setRecipePickerOpen(false);
    setGeneratedRecipes([]);
    setGeneratedSummary("");
    pushAssistantMessage(
      `Pinned ${recipe.name}. Ask about substitutions, scaling, timing, nutrition, or a hands-free step-by-step version.`,
    );
    setFollowUps([
      "Scale this for 6 people.",
      "Make this vegetarian.",
      "Guide me step by step.",
    ]);
  }

  function generateMeals() {
    const nextPrompt = mealPrompt.trim();
    if (!nextPrompt || isGenerating) return;

    setError(undefined);
    startGeneration(async () => {
      const result = await generateMealsAction({
        mealPrompt: nextPrompt,
        mealStyle,
        mealsNeeded: 3,
        servingsPerMeal: 4,
        notes:
          "Return practical meal ideas that work well inside Preppie's recipe and shopping workflow.",
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      const nextRecipes = result.recipes ?? [];
      setGeneratedRecipes(nextRecipes);
      setGeneratedSummary(result.summary ?? "");
      setShowPlanner(false);
      pushAssistantMessage(
        result.summary ||
          `I generated ${nextRecipes.length} recipe preview${nextRecipes.length === 1 ? "" : "s"} for you.`,
      );

      if (nextRecipes[0]) {
        setContext({
          type: "generated",
          name: nextRecipes[0].name,
          detail: `${nextRecipes[0].servings} servings · ${nextRecipes[0].estimated_cost_tier} cost`,
          recipe: nextRecipes[0],
        });
      }

      setFollowUps([
        "Make one of these cheaper.",
        "Which one is fastest?",
        "Turn one into a cooking plan.",
      ]);
    });
  }

  function pinGeneratedRecipe(recipe: AiRecipePreview) {
    setContext({
      type: "generated",
      name: recipe.name,
      detail: `${recipe.servings} servings · ${recipe.estimated_cost_tier} cost`,
      recipe,
    });
    pushAssistantMessage(
      `Pinned ${recipe.name} from your generated ideas. We can refine it, swap ingredients, or turn it into a cooking plan.`,
    );
  }

  function focusInputSoon() {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  const currentPrompts = handsFreeMode ? HANDS_FREE_PROMPTS : followUps;
  const contextLabel =
    context.type === "none"
      ? "No recipe pinned"
      : `${context.name} · ${context.detail}`;
  const actionButtons = [
    {
      label: "Paste a link",
      onClick: () => {
        setShowLinkInput((current) => !current);
        setShowPlanner(false);
      },
    },
    {
      label: "My recipes",
      onClick: openRecipePicker,
    },
    {
      label: "Plan meals",
      onClick: () => {
        setShowPlanner((current) => !current);
        setShowLinkInput(false);
      },
    },
  ];

  function renderLinkPanel(isExpandedView: boolean) {
    return (
      <div
        className={`border border-[#c0dedf] bg-white ${
          isExpandedView
            ? "rounded-[24px] p-4 shadow-sm"
            : "mt-3 rounded-2xl p-3"
        }`}
      >
        <p className="text-sm font-semibold text-on-surface">
          Import from a creator link
        </p>
        <p className="mt-1 text-xs leading-5 text-outline">
          Best on YouTube first. TikTok and Instagram work better when you also
          paste the caption or transcript.
        </p>
        <div className="mt-3 space-y-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                importLink();
              }
            }}
            placeholder="https://..."
            className="w-full rounded-2xl border border-outline-variant/70 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary-fixed-dim"
          />
          <textarea
            value={linkSupplementalText}
            onChange={(event) => setLinkSupplementalText(event.target.value)}
            rows={isExpandedView ? 4 : 3}
            placeholder="Optional: paste the creator caption, transcript, or notes."
            className="w-full resize-none rounded-2xl border border-outline-variant/70 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary-fixed-dim"
          />
          <button
            type="button"
            onClick={importLink}
            disabled={!linkUrl.trim() || isImporting}
            className={`rounded-2xl bg-primary-fixed-dim px-4 py-2.5 text-sm font-semibold text-on-primary-fixed disabled:opacity-50 ${
              isExpandedView ? "w-full" : ""
            }`}
          >
            {isImporting ? "Importing..." : "Import recipe"}
          </button>
        </div>
      </div>
    );
  }

  function renderPlannerPanel(isExpandedView: boolean) {
    return (
      <div
        className={`border border-[#c0dedf] bg-white ${
          isExpandedView
            ? "rounded-[24px] p-4 shadow-sm"
            : "mt-3 rounded-2xl p-3"
        }`}
      >
        <p className="text-sm font-semibold text-on-surface">
          Plan meals with Butter Me
        </p>
        <div className="mt-3 space-y-3">
          <input
            type="text"
            value={mealPrompt}
            onChange={(event) => setMealPrompt(event.target.value)}
            placeholder="Cheap high-protein dinners for the week"
            className="w-full rounded-2xl border border-outline-variant/70 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary-fixed-dim"
          />
          <div className="flex flex-wrap gap-2">
            {[
              ["standard", "Standard"],
              ["high_protein", "High protein"],
              ["meal_prep", "Meal prep"],
              ["quick", "Quick"],
              ["inventory_first", "Inventory first"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMealStyle(value as typeof mealStyle)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  mealStyle === value
                    ? "bg-primary-fixed-dim text-on-primary-fixed"
                    : "border border-[#c0dedf] bg-white text-on-surface"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={generateMeals}
            disabled={isGenerating || !mealPrompt.trim()}
            className="w-full rounded-2xl bg-primary-fixed-dim px-4 py-2.5 text-sm font-semibold text-on-primary-fixed disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Generate recipe ideas"}
          </button>
        </div>
      </div>
    );
  }

  function renderGeneratedIdeas(isExpandedView: boolean) {
    if (generatedRecipes.length === 0) return null;

    return (
      <div
        className={`border border-[#c0dedf] ${
          isExpandedView
            ? "rounded-[24px] bg-white p-4 shadow-sm"
            : "border-b bg-[#fff8ef] px-4 py-3"
        }`}
      >
        <div
          className={
            isExpandedView ? "" : "mb-2 flex items-center justify-between gap-2"
          }
        >
          <div>
            <p className="text-sm font-semibold text-on-surface">
              Generated ideas
            </p>
            <p className="mt-1 text-xs leading-5 text-outline">
              {generatedSummary}
            </p>
          </div>
        </div>

        <div
          className={
            isExpandedView
              ? "mt-3 space-y-2"
              : "flex gap-2 overflow-x-auto pb-1"
          }
        >
          {generatedRecipes.map((recipe) => (
            <button
              key={recipe.name}
              type="button"
              onClick={() => pinGeneratedRecipe(recipe)}
              className={
                isExpandedView
                  ? "w-full rounded-2xl border border-[#c0dedf] bg-[#fff8ef] p-3 text-left transition hover:border-primary/40"
                  : "min-w-[190px] shrink-0 rounded-2xl border border-[#c0dedf] bg-white p-3 text-left shadow-sm transition hover:border-primary/40"
              }
            >
              <p className="line-clamp-2 text-sm font-semibold text-on-surface">
                {recipe.name}
              </p>
              <p className="mt-1 text-xs text-outline">
                {recipe.servings} servings · {recipe.estimated_cost_tier} cost
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-on-surface-variant">
                {recipe.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderMessages(isExpandedView: boolean) {
    return (
      <div
        className={`flex-1 space-y-3 overflow-y-auto bg-surface-container-low/40 ${
          isExpandedView ? "px-6 py-6" : "px-4 py-4"
        }`}
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`${
                isExpandedView
                  ? "max-w-[78%] rounded-[24px] px-4 py-3 text-[15px] leading-7"
                  : "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6"
              } ${
                message.role === "user"
                  ? "bg-primary-fixed-dim text-on-primary-fixed"
                  : "border border-outline-variant/50 bg-white text-on-surface shadow-sm"
              }`}
            >
              {message.role === "assistant" ? (
                <ChatMarkdown content={message.content} />
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {isPending && (
          <p
            className={`w-fit border border-outline-variant/50 bg-white text-sm text-outline shadow-sm ${
              isExpandedView
                ? "rounded-[24px] px-4 py-3"
                : "rounded-2xl px-3.5 py-2.5"
            }`}
          >
            Thinking...
          </p>
        )}
      </div>
    );
  }

  function renderComposer(isExpandedView: boolean) {
    return (
      <div
        className={`border-t border-outline-variant/40 bg-white ${
          isExpandedView ? "px-6 py-5" : "p-3"
        }`}
      >
        {error && (
          <p
            className={`border border-error/20 bg-error-container/40 text-sm text-error ${
              isExpandedView
                ? "mb-3 rounded-2xl px-3 py-2"
                : "mb-2 rounded-xl px-3 py-2"
            }`}
          >
            {error}
          </p>
        )}

        {currentPrompts.length > 0 && (
          <div
            className={
              isExpandedView
                ? "mb-3 flex flex-wrap gap-2"
                : "mb-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar"
            }
          >
            {currentPrompts.slice(0, 4).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => submit(item)}
                disabled={isPending}
                className="shrink-0 rounded-full border border-outline-variant/70 bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-primary-surface disabled:opacity-60"
              >
                {item}
              </button>
            ))}
          </div>
        )}

        <form
          className={`flex items-end ${isExpandedView ? "gap-3" : "gap-2"}`}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={
              handsFreeMode
                ? "Ask for the next step, repeat, or timing..."
                : "Ask about cooking, ingredients, substitutions, or meal prep..."
            }
            rows={isExpandedView ? 3 : 2}
            className={`flex-1 resize-none border border-outline-variant/70 bg-white text-sm text-on-surface outline-none focus:border-primary-fixed-dim ${
              isExpandedView
                ? "min-h-16 rounded-[24px] px-4 py-3"
                : "max-h-28 min-h-12 rounded-2xl px-3 py-2"
            }`}
          />
          <button
            type="button"
            onClick={() => setHandsFreeMode((current) => !current)}
            className={`shrink-0 items-center justify-center border ${
              handsFreeMode
                ? "border-primary-fixed-dim bg-primary-surface text-primary-fixed-dim"
                : "border-outline-variant/70 bg-white text-outline"
            } ${isExpandedView ? "flex h-14 w-14 rounded-2xl" : "flex h-12 w-12 rounded-2xl"}`}
            aria-label="Toggle hands-free mode"
          >
            <span className="material-symbols-outlined text-[20px]">mic</span>
          </button>
          <button
            type="submit"
            disabled={isPending || !prompt.trim()}
            className={`shrink-0 items-center justify-center bg-primary-fixed-dim text-on-primary-fixed hover:bg-primary-fixed disabled:cursor-not-allowed disabled:opacity-50 ${
              isExpandedView
                ? "flex h-14 w-14 rounded-2xl"
                : "flex h-12 w-12 rounded-2xl"
            }`}
            aria-label="Ask Preppie"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>

        {safetyNotes.length > 0 && (
          <p
            className={`text-[11px] leading-4 text-outline ${isExpandedView ? "mt-3" : "mt-2"}`}
          >
            {safetyNotes[0]}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-[70] lg:bottom-6 lg:right-6">
      {isOpen && (
        <>
          {isExpanded && (
            <div
              className="fixed inset-0 z-[69] bg-[rgba(40,24,12,0.18)] backdrop-blur-md"
              onClick={() => setIsExpanded(false)}
            />
          )}

          {isExpanded ? (
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
                            Butter Me AI
                          </p>
                          <h2 className="text-base font-semibold text-on-surface">
                            Kitchen sidekick
                          </h2>
                          <p className="mt-1 text-xs leading-5 text-outline">
                            Stays beside the recipe flow while you plan, import,
                            and cook.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsExpanded(false)}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/60 bg-white hover:bg-surface-container-low"
                          aria-label="Shrink Preppie chat"
                        >
                          <span className="material-symbols-outlined text-[19px]">
                            close_fullscreen
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            setIsExpanded(false);
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/60 bg-white hover:bg-surface-container-low"
                          aria-label="Close Preppie chat"
                        >
                          <span className="material-symbols-outlined text-[19px]">
                            close
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[24px] border border-[#c0dedf] bg-white px-4 py-3 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-outline">
                        Current context
                      </p>
                      <p className="mt-2 text-sm font-semibold text-on-surface">
                        {context.type === "none"
                          ? "No recipe pinned"
                          : context.name}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-outline">
                        {context.type === "none"
                          ? "Import a link, pick one of your recipes, or generate ideas to give Preppie more context."
                          : context.detail}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {actionButtons.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={action.onClick}
                          className="rounded-full border border-[#c0dedf] bg-white px-3 py-1.5 text-xs font-medium text-on-surface transition hover:border-primary/40"
                        >
                          {action.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setHandsFreeMode((current) => !current)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          handsFreeMode
                            ? "bg-primary-fixed-dim text-on-primary-fixed"
                            : "border border-[#c0dedf] bg-white text-on-surface hover:border-primary/40"
                        }`}
                      >
                        Hands-free
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                    {showLinkInput && renderLinkPanel(true)}
                    {showPlanner && renderPlannerPanel(true)}
                    {renderGeneratedIdeas(true)}
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
                          Cook, adapt, and keep moving
                        </h3>
                        <p className="mt-1 text-sm text-outline">
                          {contextLabel}
                        </p>
                      </div>

                      <div className="rounded-full border border-[#c0dedf] bg-[#fff8ef] px-3 py-1.5 text-xs font-medium text-primary-fixed-dim">
                        {handsFreeMode
                          ? "Hands-free on"
                          : "Hands-free available"}
                      </div>
                    </div>
                  </header>

                  {renderMessages(true)}
                  {renderComposer(true)}
                </div>
              </div>

              {recipePickerOpen && (
                <div className="absolute inset-0 flex items-end bg-black/25">
                  <div className="max-h-[72%] w-full rounded-t-[28px] bg-white p-4 shadow-2xl">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-on-surface">
                          My recipes
                        </p>
                        <p className="text-xs text-outline">
                          Pick one to keep pinned while you chat.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRecipePickerOpen(false)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/60 bg-white"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          close
                        </span>
                      </button>
                    </div>

                    <div className="space-y-2 overflow-y-auto">
                      {loadingRecipes ? (
                        <p className="rounded-2xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-sm text-outline">
                          Loading recipes...
                        </p>
                      ) : savedRecipes.length === 0 ? (
                        <p className="rounded-2xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-sm text-outline">
                          No recipes found yet.
                        </p>
                      ) : (
                        savedRecipes.map((recipe) => (
                          <button
                            key={recipe.id}
                            type="button"
                            onClick={() => selectRecipe(recipe)}
                            className="w-full rounded-2xl border border-[#c0dedf] bg-white px-3 py-3 text-left transition hover:border-primary/40"
                          >
                            <p className="text-sm font-semibold text-on-surface">
                              {recipe.name}
                            </p>
                            <p className="mt-1 text-xs text-outline">
                              {recipe.servings} servings
                              {recipe.nutrition_data?.calories
                                ? ` · ${recipe.nutrition_data.calories} kcal`
                                : ""}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="relative z-[70] mb-3 flex h-[min(760px,calc(100vh-5rem))] w-[min(460px,calc(100vw-1rem))] flex-col overflow-hidden rounded-[28px] border border-[#c0dedf] bg-white shadow-[0_24px_80px_rgba(60,154,158,0.18)]">
              <header
                className="border-b border-[#c0dedf] px-4 py-4"
                style={{
                  background: "linear-gradient(120deg, #fff8ef, #fffdfa)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-fixed-dim text-on-primary-fixed">
                      <span className="material-symbols-outlined text-[22px]">
                        restaurant
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary-fixed-dim">
                        Preppie AI
                      </p>
                      <h2 className="text-sm font-semibold text-on-surface">
                        Kitchen sidekick
                      </h2>
                      <p className="mt-0.5 text-xs text-outline">
                        {contextLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsExpanded(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/60 bg-white hover:bg-surface-container-low"
                      aria-label="Expand Preppie chat"
                    >
                      <span className="material-symbols-outlined text-[19px]">
                        open_in_full
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setIsExpanded(false);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/60 bg-white hover:bg-surface-container-low"
                      aria-label="Close Preppie chat"
                    >
                      <span className="material-symbols-outlined text-[19px]">
                        close
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {actionButtons.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={action.onClick}
                      className="rounded-full border border-[#c0dedf] bg-white px-3 py-1.5 text-xs font-medium text-on-surface transition hover:border-primary/40"
                    >
                      {action.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setHandsFreeMode((current) => !current)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      handsFreeMode
                        ? "bg-primary-fixed-dim text-on-primary-fixed"
                        : "border border-[#c0dedf] bg-white text-on-surface hover:border-primary/40"
                    }`}
                  >
                    Hands-free
                  </button>
                </div>

                {showLinkInput && renderLinkPanel(false)}
                {showPlanner && renderPlannerPanel(false)}
              </header>

              {renderGeneratedIdeas(false)}
              {renderMessages(false)}
              {renderComposer(false)}

              {recipePickerOpen && (
                <div className="absolute inset-0 flex items-end bg-black/25">
                  <div className="max-h-[72%] w-full rounded-t-[28px] bg-white p-4 shadow-2xl">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-on-surface">
                          My recipes
                        </p>
                        <p className="text-xs text-outline">
                          Pick one to keep pinned while you chat.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRecipePickerOpen(false)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/60 bg-white"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          close
                        </span>
                      </button>
                    </div>

                    <div className="space-y-2 overflow-y-auto">
                      {loadingRecipes ? (
                        <p className="rounded-2xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-sm text-outline">
                          Loading recipes...
                        </p>
                      ) : savedRecipes.length === 0 ? (
                        <p className="rounded-2xl border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-sm text-outline">
                          No recipes found yet.
                        </p>
                      ) : (
                        savedRecipes.map((recipe) => (
                          <button
                            key={recipe.id}
                            type="button"
                            onClick={() => selectRecipe(recipe)}
                            className="w-full rounded-2xl border border-[#c0dedf] bg-white px-3 py-3 text-left transition hover:border-primary/40"
                          >
                            <p className="text-sm font-semibold text-on-surface">
                              {recipe.name}
                            </p>
                            <p className="mt-1 text-xs text-outline">
                              {recipe.servings} servings
                              {recipe.nutrition_data?.calories
                                ? ` · ${recipe.nutrition_data.calories} kcal`
                                : ""}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
          setIsExpanded(false);
          focusInputSoon();
        }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed-dim text-on-primary-fixed shadow-xl ring-1 ring-white/70 transition hover:bg-primary-fixed active:scale-95"
        aria-label="Open Preppie chat"
      >
        <span className="material-symbols-outlined text-[25px]">
          {isOpen ? "keyboard_arrow_down" : "restaurant"}
        </span>
      </button>
    </div>
  );
}
