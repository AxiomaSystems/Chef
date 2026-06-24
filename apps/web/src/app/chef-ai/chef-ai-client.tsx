"use client";

import { useEffect, useRef, useState } from "react";
import type { BaseRecipe } from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
};

type LinkContext = {
  platform: "tiktok" | "instagram" | "youtube" | "other";
  url: string;
  title: string;
  creator: string;
  description: string;
};

type ChatContext =
  | { type: "none" }
  | { type: "recipe"; recipe: BaseRecipe }
  | { type: "link"; link: LinkContext };

type Mode = "idle" | "link-input" | "link-loading" | "chat";

const QUICK_CHIPS = [
  "What can I cook tonight?",
  "Substitute Tahini?",
  "Make it Vegan?",
  "Scale for 6 people",
  "How long will this take?",
  "What's high in protein?",
];

const HANDS_FREE_CHIPS = [
  "Guide me one step at a time.",
  "Repeat the last step.",
  "What can I prep while I wait?",
  "Keep instructions short and spoken-friendly.",
];

const MOCK_LINK_DATA: Record<string, Omit<LinkContext, "url">> = {
  tiktok: {
    platform: "tiktok",
    title: "Creamy Tuscan Salmon",
    creator: "@whatsgabycooking",
    description:
      "Pan-seared salmon with sun-dried tomatoes, garlic, spinach, and a creamy parmesan sauce. Ready in 20 minutes!",
  },
  instagram: {
    platform: "instagram",
    title: "One-Pan Lemon Herb Chicken",
    creator: "@minimalistbaker",
    description:
      "Juicy chicken thighs with roasted lemon, fresh herbs, and garlic. A weeknight staple in 35 minutes.",
  },
  youtube: {
    platform: "youtube",
    title: "The Best Homemade Ramen",
    creator: "Joshua Weissman",
    description:
      "Rich tonkotsu-style broth with chashu pork, soft-boiled eggs, nori, and green onions. Restaurant quality at home.",
  },
};

function detectPlatform(url: string): LinkContext["platform"] {
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  return "other";
}

function extractIngredient(input: string): string | null {
  const patterns = [
    /substitute (?:for )?(.+?)(?:\?|$)/i,
    /replace (?:the )?(.+?)(?:\?|$)/i,
    /instead of (?:the )?(.+?)(?:\?|$)/i,
    /swap (?:out )?(?:the )?(.+?)(?:\?|$)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1].trim();
  }

  return null;
}

function getHandsFreeSuffix(enabled: boolean) {
  if (!enabled) return "";

  return "\n\nHands-free mode is on, so I will keep this short, practical, and easy to follow step by step.";
}

function getMockResponse(
  input: string,
  context: ChatContext,
  handsFreeMode: boolean,
): string {
  const lower = input.toLowerCase();

  if (
    lower.includes("substitute") ||
    lower.includes("replace") ||
    lower.includes("instead") ||
    lower.includes("swap")
  ) {
    const ingredient = extractIngredient(input);
    return `Here are some substitutes${ingredient ? ` for **${ingredient}**` : ""}:

- **Tahini** -> Sunflower seed butter, almond butter, or hummus.
- **Buttermilk** -> 1 cup milk + 1 tbsp lemon juice, rest 5 minutes.
- **Eggs** -> 1 flax egg for baking.

Taste and adjust seasoning after the swap because the flavor can shift slightly.${getHandsFreeSuffix(handsFreeMode)}`;
  }

  if (
    lower.includes("vegan") ||
    lower.includes("plant-based") ||
    lower.includes("dairy-free")
  ) {
    return `Here is a simple vegan conversion:

- **Dairy** -> Oat milk, coconut milk, or cashew cream
- **Eggs** -> Flax egg or aquafaba
- **Honey** -> Maple syrup or agave
- **Butter** -> Vegan butter or coconut oil

Most swaps are close to 1:1.${getHandsFreeSuffix(handsFreeMode)}`;
  }

  if (
    lower.includes("tonight") ||
    lower.includes("what to cook") ||
    lower.includes("dinner") ||
    lower.includes("cook") ||
    lower.includes("meal idea")
  ) {
    return `Here are a few solid dinner ideas:

- Garlic butter pasta in 15 minutes
- Chickpea salad with lemon tahini in 20 minutes
- Stir-fried noodles with leftover vegetables in 25 minutes
- One-pan chicken thighs with potatoes in 30 minutes

Once this is connected to your inventory, I can narrow it to what you already have.${getHandsFreeSuffix(handsFreeMode)}`;
  }

  if (
    lower.includes("scale") ||
    lower.includes("servings") ||
    lower.includes("double") ||
    lower.includes("halve") ||
    lower.includes("people")
  ) {
    const match = input.match(/\d+/);
    const servings = match ? match[0] : "6";

    return `To scale for **${servings} people**:

- Increase cook time by about 20 to 30%
- Scale salt a little under the full ratio, then taste
- Keep the cooking temperature the same
- Use a larger pan or cook in batches

Full AI integration can later auto-calculate ingredient amounts.${getHandsFreeSuffix(handsFreeMode)}`;
  }

  if (
    lower.includes("calorie") ||
    lower.includes("protein") ||
    lower.includes("nutrition") ||
    lower.includes("healthy") ||
    lower.includes("macro")
  ) {
    return `Estimated nutrition per serving:

- **Calories:** ~380 kcal
- **Protein:** ~22g
- **Carbs:** ~35g
- **Fat:** ~14g
- **Fiber:** ~6g

To boost protein, add chickpeas, Greek yogurt, tofu, or lean meat.${getHandsFreeSuffix(handsFreeMode)}`;
  }

  if (
    lower.includes("how long") ||
    lower.includes("time") ||
    lower.includes("minutes") ||
    lower.includes("hours")
  ) {
    return `Rough timing:

- **Prep:** 10 to 15 min
- **Cook:** 20 to 30 min
- **Rest:** 5 min

Total time is about **35 to 50 minutes**.${getHandsFreeSuffix(handsFreeMode)}`;
  }

  if (context.type === "link") {
    return `I pulled details from that ${context.link.platform} post.

**${context.link.title}** by ${context.link.creator}

${context.link.description}

Ask about substitutions, timing, scaling, or dietary changes.${getHandsFreeSuffix(handsFreeMode)}`;
  }

  if (context.type === "recipe") {
    return `I am looking at **${context.recipe.name}** right now.

I can help with substitutions, dietary changes, servings, timing, and nutrition.${getHandsFreeSuffix(handsFreeMode)}`;
  }

  return `I am Preppie AI and I can help with:

- substitutions
- vegan or gluten-free changes
- scaling servings
- timing
- nutrition
- meal ideas

Pick a recipe, paste a link, or ask me directly.${getHandsFreeSuffix(handsFreeMode)}`;
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34l-.04-8.32a8.18 8.18 0 004.79 1.52V5.07a4.85 4.85 0 01-1-.38z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function renderContent(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, index) =>
    index % 2 === 1 ? <strong key={index}>{part}</strong> : part,
  );
}

export function ChefAIClient({ recipes }: { recipes: BaseRecipe[] }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      content:
        "Hello! I'm your **Preppie AI**. I can help with a saved recipe, a social link, or quick kitchen questions while you cook.",
    },
  ]);
  const [input, setInput] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [context, setContext] = useState<ChatContext>({ type: "none" });
  const [isTyping, setIsTyping] = useState(false);
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function sendMessage(text: string) {
    if (!text.trim() || isTyping) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: text },
    ]);
    setInput("");
    setIsTyping(true);
    setMode("chat");

    setTimeout(
      () => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "ai",
            content: getMockResponse(text, context, handsFreeMode),
          },
        ]);
        setIsTyping(false);
      },
      1000 + Math.random() * 700,
    );
  }

  function handleLinkSubmit() {
    if (!linkUrl.trim()) return;

    const platform = detectPlatform(linkUrl);
    setMode("link-loading");

    setTimeout(() => {
      const raw = MOCK_LINK_DATA[platform] ?? {
        platform: "other" as const,
        title: "Recipe from link",
        creator: "Unknown creator",
        description: "Ask me anything about this recipe.",
      };

      const link: LinkContext = { ...raw, url: linkUrl, platform };
      setContext({ type: "link", link });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content: `I found a recipe from that ${
            platform === "other"
              ? "link"
              : platform.charAt(0).toUpperCase() + platform.slice(1)
          } post.

**${link.title}** by ${link.creator}

${link.description}

What should we do with it first?`,
        },
      ]);
      setMode("chat");
      setLinkUrl("");
    }, 1800);
  }

  function handlePickRecipe(recipe: BaseRecipe) {
    setContext({ type: "recipe", recipe });
    setRecipePickerOpen(false);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "ai",
        content: `Great choice. I am now looking at **${recipe.name}**${
          recipe.nutrition_data?.calories
            ? ` (~${recipe.nutrition_data.calories} kcal per serving)`
            : ""
        }.

Ask for substitutions, timing, scaling, or a simpler step-by-step version.`,
      },
    ]);
    setMode("chat");
  }

  function clearContext() {
    setContext({ type: "none" });
  }

  function activateHandsFreeMode() {
    setHandsFreeMode((prev) => !prev);
  }

  const contextLabel =
    context.type === "recipe"
      ? context.recipe.name
      : context.type === "link"
        ? `From ${context.link.platform}`
        : "No recipe selected";

  const currentPromptSet = handsFreeMode ? HANDS_FREE_CHIPS : QUICK_CHIPS;

  return (
    <AppShell topBarTitle="Preppie AI">
      <div
        className="flex flex-col bg-[#fff8ef]"
        style={{ height: "calc(100svh - 52px)" }}
      >
        <div
          className="shrink-0 px-5 py-4"
          style={{ background: "linear-gradient(120deg, #fe8e17, #fe8e17)" }}
        >
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/18">
                <span className="material-symbols-outlined text-[24px] text-white">
                  restaurant
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight text-white">
                  Preppie AI
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/85">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
                    Online and ready to help
                  </span>
                  {handsFreeMode && (
                    <span className="rounded-full bg-white/18 px-2.5 py-1 font-medium text-white">
                      Hands-free mode
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="hidden min-w-0 items-center gap-2 rounded-2xl bg-white/14 px-3 py-2 text-white/90 lg:flex">
              <span className="material-symbols-outlined text-[16px]">
                {context.type === "recipe"
                  ? "receipt_long"
                  : context.type === "link"
                    ? "link"
                    : "kitchen"}
              </span>
              <span className="truncate text-sm font-medium">
                {contextLabel}
              </span>
              {context.type !== "none" && (
                <button
                  onClick={clearContext}
                  className="rounded-full text-white/70 transition hover:text-white"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    close
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:px-5">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-[#c0dedf] bg-white shadow-[0_12px_40px_rgba(60,154,158,0.08)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#c0dedf] px-4 py-3 sm:px-5">
              <div>
                <p className="text-sm font-semibold text-on-surface">
                  Kitchen chat
                </p>
                <p className="text-xs text-outline">
                  Keep asking questions while your recipe or link stays docked.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="rounded-full bg-[#fff2e3] px-3 py-1 text-xs font-medium text-[#f4790d]">
                  {contextLabel}
                </div>
                {context.type !== "none" && (
                  <button
                    onClick={clearContext}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-low text-outline transition hover:text-on-surface"
                    aria-label="Clear selected context"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      close
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#fff8ef] px-4 py-4 sm:px-5">
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${
                      msg.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    {msg.role === "ai" && (
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim">
                        <span className="material-symbols-outlined text-[16px] text-white">
                          restaurant
                        </span>
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] whitespace-pre-line rounded-3xl px-4 py-3 text-sm leading-relaxed sm:max-w-[78%] ${
                        msg.role === "user"
                          ? "rounded-tr-md bg-primary-fixed-dim text-white"
                          : "rounded-tl-md border border-outline-variant/20 bg-white text-on-surface shadow-sm"
                      }`}
                    >
                      {renderContent(msg.content)}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim">
                      <span className="material-symbols-outlined text-[16px] text-white">
                        restaurant
                      </span>
                    </div>
                    <div className="flex items-center gap-1 rounded-3xl rounded-tl-md border border-outline-variant/20 bg-white px-4 py-3.5 shadow-sm">
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-outline/50"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-outline/50"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-outline/50"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
            <section className="rounded-[24px] border border-[#c0dedf] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-on-surface">
                    Start from something real
                  </p>
                  <p className="text-xs text-outline">
                    These stay available even after the conversation starts.
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <button
                  onClick={() =>
                    setMode((prev) =>
                      prev === "link-input" ? "chat" : "link-input",
                    )
                  }
                  className="flex items-center gap-3 rounded-2xl border border-[#c0dedf] bg-[#fff8ef] px-3 py-3 text-left transition hover:border-primary/35 hover:bg-[#fff2e3]"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      background: "linear-gradient(135deg, #ec4899, #f4790d)",
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px] text-white">
                      link
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface">
                      Paste a link
                    </p>
                    <p className="text-xs text-outline">
                      TikTok, Instagram, or YouTube
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setRecipePickerOpen(true)}
                  className="flex items-center gap-3 rounded-2xl border border-[#c0dedf] bg-[#fff8ef] px-3 py-3 text-left transition hover:border-primary/35 hover:bg-[#fff2e3]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-fixed-dim">
                    <span className="material-symbols-outlined text-[18px] text-white">
                      receipt_long
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-on-surface">
                      My recipes
                    </p>
                    <p className="text-xs text-outline">
                      Pick one and keep it docked while you chat
                    </p>
                  </div>
                </button>
              </div>

              {mode === "link-input" && (
                <div className="mt-3 space-y-3 rounded-2xl border border-outline-variant/25 bg-surface-container-low p-3">
                  <div className="flex items-center gap-2 text-outline">
                    <div className="flex gap-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white">
                        <TikTokIcon />
                      </div>
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, #833ab4, #fd1d1d, #f4be6b)",
                        }}
                      >
                        <InstagramIcon />
                      </div>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white">
                        <YouTubeIcon />
                      </div>
                    </div>
                    <span className="text-xs font-medium">
                      Add a recipe from social
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      type="url"
                      placeholder="https://www.tiktok.com/@..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLinkSubmit()}
                      className="flex-1 rounded-xl border border-outline-variant/35 bg-white px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onClick={handleLinkSubmit}
                      disabled={!linkUrl.trim()}
                      className="rounded-xl bg-primary-fixed-dim px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-fixed disabled:opacity-40"
                    >
                      Use
                    </button>
                  </div>
                </div>
              )}

              {mode === "link-loading" && (
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-outline-variant/25 bg-surface-container-low p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-surface">
                    <span className="material-symbols-outlined animate-spin text-[20px] text-primary-fixed-dim">
                      refresh
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">
                      Pulling recipe details
                    </p>
                    <p className="text-xs text-outline">
                      Looking for ingredients, timing, and source context
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[24px] border border-[#c0dedf] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-on-surface">
                    Hands-free cooking
                  </p>
                  <p className="text-xs text-outline">
                    Designed for messy hands and quick spoken-style help.
                  </p>
                </div>
                <button
                  onClick={activateHandsFreeMode}
                  className={`relative flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
                    handsFreeMode
                      ? "bg-primary-fixed-dim"
                      : "bg-surface-container"
                  }`}
                  aria-pressed={handsFreeMode}
                  aria-label="Toggle hands-free mode"
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
                      handsFreeMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl bg-[#fff8ef] p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff2e3] text-[#f4790d]">
                    <span className="material-symbols-outlined text-[20px]">
                      mic
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">
                      Countertop assistant mode
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-outline">
                      Keep replies shorter, easier to glance at, and better for
                      one-step-at-a-time cooking flow.
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (!handsFreeMode) setHandsFreeMode(true);
                      sendMessage("Guide me one step at a time.");
                    }}
                    className="rounded-xl border border-[#c0dedf] bg-white px-3 py-2 text-left text-xs font-medium text-on-surface transition hover:border-primary/35"
                  >
                    Next step mode
                  </button>
                  <button
                    onClick={() => {
                      if (!handsFreeMode) setHandsFreeMode(true);
                      sendMessage("Repeat the last step.");
                    }}
                    className="rounded-xl border border-[#c0dedf] bg-white px-3 py-2 text-left text-xs font-medium text-on-surface transition hover:border-primary/35"
                  >
                    Repeat
                  </button>
                  <button
                    onClick={() => {
                      if (!handsFreeMode) setHandsFreeMode(true);
                      sendMessage("What can I prep while I wait?");
                    }}
                    className="rounded-xl border border-[#c0dedf] bg-white px-3 py-2 text-left text-xs font-medium text-on-surface transition hover:border-primary/35"
                  >
                    While I wait
                  </button>
                  <button
                    onClick={() => {
                      if (!handsFreeMode) setHandsFreeMode(true);
                      sendMessage(
                        "Keep instructions short and spoken-friendly.",
                      );
                    }}
                    className="rounded-xl border border-[#c0dedf] bg-white px-3 py-2 text-left text-xs font-medium text-on-surface transition hover:border-primary/35"
                  >
                    Spoken style
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-[#c0dedf] bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-on-surface">
                Suggested prompts
              </p>
              <div className="flex flex-wrap gap-2">
                {currentPromptSet.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    disabled={isTyping}
                    className="rounded-full border border-outline-variant/45 bg-[#fff8ef] px-3.5 py-2 text-sm font-medium text-on-surface-variant transition hover:border-primary/35 hover:text-primary disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <div className="shrink-0 border-t border-outline-variant/20 bg-[#fff8ef] px-4 pb-24 pt-2 lg:px-5 lg:pb-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            <div className="rounded-[26px] border border-[#c0dedf] bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                {handsFreeMode && (
                  <div className="hidden rounded-full bg-[#fff2e3] px-3 py-1 text-xs font-medium text-[#f4790d] sm:block">
                    Short replies enabled
                  </div>
                )}
                <input
                  type="text"
                  placeholder={
                    handsFreeMode
                      ? "Ask Preppie for the next step..."
                      : "Ask Preppie..."
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none"
                />
                <button
                  onClick={activateHandsFreeMode}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                    handsFreeMode
                      ? "bg-[#fff2e3] text-[#f4790d]"
                      : "bg-surface-container-low text-outline"
                  }`}
                  aria-label="Toggle hands-free mode"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    mic
                  </span>
                </button>
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isTyping}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-fixed-dim text-white transition hover:bg-primary-fixed disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    send
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {recipePickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center"
          onClick={() => setRecipePickerOpen(false)}
        >
          <div
            className="flex max-h-[70vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl lg:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/20 px-5 py-4">
              <p className="font-bold text-on-surface">Pick a recipe</p>
              <button
                onClick={() => setRecipePickerOpen(false)}
                className="text-outline transition hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/20">
              {recipes.length === 0 ? (
                <div className="py-12 text-center text-outline">
                  <span className="material-symbols-outlined mb-2 block text-[40px] opacity-40">
                    receipt_long
                  </span>
                  <p className="text-sm">No saved recipes yet.</p>
                </div>
              ) : (
                recipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => handlePickRecipe(recipe)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-surface-container-low"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-surface">
                      <span className="material-symbols-outlined text-[20px] text-primary-fixed-dim">
                        restaurant
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-on-surface">
                        {recipe.name}
                      </p>
                      <p className="text-xs text-outline">
                        {recipe.servings} servings
                        {recipe.nutrition_data?.calories
                          ? ` - ${recipe.nutrition_data.calories} kcal`
                          : ""}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-outline">
                      chevron_right
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
