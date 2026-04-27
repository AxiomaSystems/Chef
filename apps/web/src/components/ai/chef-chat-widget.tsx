"use client";

import { usePathname } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { askChefAction, type ChefChatMessage } from "@/app/ai-actions";

const STARTER_PROMPTS = [
  "What can I cook with what I have?",
  "Make this meal cheaper.",
  "Plan high-protein dinners for the week.",
];

export function ChefChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChefChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me about meals, ingredients, substitutions, grocery planning, or cooking prep.",
    },
  ]);
  const [followUps, setFollowUps] = useState<string[]>(STARTER_PROMPTS);
  const [safetyNotes, setSafetyNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function submit(messageOverride?: string) {
    const nextPrompt = (messageOverride ?? prompt).trim();
    if (!nextPrompt || isPending) return;

    const userMessage: ChefChatMessage = {
      role: "user",
      content: nextPrompt,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setPrompt("");
    setError(undefined);
    setSafetyNotes([]);

    startTransition(async () => {
      const result = await askChefAction({
        message: nextPrompt,
        history: messages.filter((message) => message.content.trim()).slice(-8),
        context: {
          page: pathname,
          surface: "global_chef_chat_widget",
        },
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
      setFollowUps(result.followUpPrompts?.length ? result.followUpPrompts : STARTER_PROMPTS);
      setSafetyNotes(result.safetyNotes ?? []);
    });
  }

  return (
    <div className="fixed bottom-24 right-4 z-[70] lg:bottom-6 lg:right-6">
      {isOpen && (
        <section className="mb-3 flex h-[min(680px,calc(100vh-8rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-outline-variant/60 bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-outline-variant/40 px-4 py-3">
            <div>
              <p className="text-label-sm uppercase text-primary-fixed-dim">Chef AI</p>
              <h2 className="text-label-lg text-on-surface">Food and planning assistant</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container"
              aria-label="Close Chef chat"
            >
              <span className="material-symbols-outlined text-[19px]">close</span>
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-surface-container-low/60 px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[86%] whitespace-pre-wrap rounded-lg px-3 py-2 text-body-sm ${
                    message.role === "user"
                      ? "bg-primary-fixed-dim text-on-primary-fixed"
                      : "border border-outline-variant/50 bg-white text-on-surface"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))}
            {isPending && (
              <p className="w-fit rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-body-sm text-outline">
                Thinking...
              </p>
            )}
          </div>

          <div className="border-t border-outline-variant/40 bg-white p-3">
            {error && (
              <p className="mb-2 rounded-md border border-error/20 bg-error-container/40 px-3 py-2 text-body-sm text-error">
                {error}
              </p>
            )}

            {followUps.length > 0 && (
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {followUps.slice(0, 3).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => submit(item)}
                    disabled={isPending}
                    className="shrink-0 rounded-full border border-outline-variant/70 bg-surface-container-low px-3 py-1.5 text-label-md text-on-surface-variant hover:bg-primary-surface disabled:opacity-60"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask about cooking, ingredients, meal prep..."
                rows={2}
                className="max-h-28 min-h-12 flex-1 resize-none rounded-lg border border-outline-variant/70 bg-white px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary-fixed-dim"
              />
              <button
                type="submit"
                disabled={isPending || !prompt.trim()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-fixed-dim text-on-primary-fixed hover:bg-primary-fixed disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Ask Chef"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </form>

            {safetyNotes.length > 0 && (
              <p className="mt-2 text-[11px] leading-4 text-outline">
                {safetyNotes[0]}
              </p>
            )}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
          window.setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed-dim text-on-primary-fixed shadow-xl ring-1 ring-white/70 transition hover:bg-primary-fixed active:scale-95"
        aria-label="Open Chef chat"
      >
        <span className="material-symbols-outlined text-[25px]">
          {isOpen ? "keyboard_arrow_down" : "restaurant"}
        </span>
      </button>
    </div>
  );
}

