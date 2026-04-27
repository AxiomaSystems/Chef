import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

export default function ChefAIPage() {
  return (
    <AppShell topBarTitle="Chef AI">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <section className="overflow-hidden rounded-[32px] border border-[#eeded0] bg-white shadow-[0_20px_80px_rgba(97,58,29,0.08)]">
          <div
            className="px-6 py-8"
            style={{ background: "linear-gradient(120deg, #fff7f1, #fffdfb)" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary-fixed-dim">
              Chef AI
            </p>
            <h1 className="mt-2 text-3xl font-bold text-on-surface">
              Your assistant now lives beside the workflow
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
              Instead of sending you to a separate AI screen, Chef AI now stays
              available as a side chatbot across the workspace. You can paste a
              creator link, pin one of your saved recipes, generate meal ideas,
              and switch into hands-free cooking mode without leaving the page
              you are already on.
            </p>
          </div>

          <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[#eeded0] bg-[#fffaf6] p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-fixed-dim text-on-primary-fixed">
                <span className="material-symbols-outlined text-[20px]">link</span>
              </div>
              <p className="text-sm font-semibold text-on-surface">Paste a link</p>
              <p className="mt-1 text-xs leading-6 text-outline">
                Bring in creator recipes from TikTok, Instagram, or YouTube and
                chat about them in place.
              </p>
            </div>

            <div className="rounded-2xl border border-[#eeded0] bg-[#fffaf6] p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-fixed-dim text-on-primary-fixed">
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              </div>
              <p className="text-sm font-semibold text-on-surface">Pin recipes</p>
              <p className="mt-1 text-xs leading-6 text-outline">
                Keep one of your recipes in context while you ask about swaps,
                timing, scaling, or meal prep.
              </p>
            </div>

            <div className="rounded-2xl border border-[#eeded0] bg-[#fffaf6] p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-fixed-dim text-on-primary-fixed">
                <span className="material-symbols-outlined text-[20px]">mic</span>
              </div>
              <p className="text-sm font-semibold text-on-surface">Hands-free mode</p>
              <p className="mt-1 text-xs leading-6 text-outline">
                Switch to shorter, step-by-step cooking help when your hands are
                busy in the kitchen.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-[#eeded0] px-6 py-5">
            <Link
              href="/dashboard"
              className="rounded-full bg-primary-fixed-dim px-5 py-2.5 text-sm font-semibold text-on-primary-fixed"
            >
              Go to dashboard
            </Link>
            <Link
              href="/recipes"
              className="rounded-full border border-[#e4d1c0] bg-white px-5 py-2.5 text-sm font-semibold text-on-surface"
            >
              Browse recipes
            </Link>
            <Link
              href="/shopping"
              className="rounded-full border border-[#e4d1c0] bg-white px-5 py-2.5 text-sm font-semibold text-on-surface"
            >
              Open shopping
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
