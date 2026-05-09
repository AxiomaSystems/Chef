import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

export default function CreatePage() {
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
            Start from scratch or bring in a recipe link you already found.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/recipes?new=1"
            className="flex min-h-44 flex-col justify-between rounded-[1.6rem] bg-secondary-container p-5 text-on-secondary-container shadow-sm transition-transform active:scale-[0.98]"
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
          </Link>

          <Link
            href="/import"
            className="flex min-h-44 flex-col justify-between rounded-[1.6rem] border border-outline-variant/35 bg-white p-5 text-on-surface shadow-sm transition-transform active:scale-[0.98]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-surface text-primary">
              <span className="material-symbols-outlined text-[26px] leading-none">
                add_link
              </span>
            </span>
            <span>
              <span className="block text-headline-sm">Import a recipe</span>
              <span className="mt-2 block text-body-sm text-on-surface-variant">
                Paste a social or web recipe link and save it to your kitchen.
              </span>
            </span>
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
