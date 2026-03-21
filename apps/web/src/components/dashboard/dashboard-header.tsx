import type { User } from "@cart/shared";
import Link from "next/link";

export function DashboardHeader(props: {
  user: User;
  logoutAction: () => Promise<void>;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-[color:var(--line)] bg-white/55 px-5 py-4 shadow-[var(--shadow)] backdrop-blur-sm sm:px-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--olive)]">
          Misen workspace
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl leading-none text-[color:var(--forest-strong)] sm:text-4xl">
            Home
          </h1>
          <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/76 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">
            {props.user.name}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/account/settings/overview"
          className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/74 px-4 text-sm font-semibold text-[color:var(--forest-strong)] transition hover:border-[color:var(--olive)] hover:bg-[color:var(--paper)]"
        >
          Account
        </Link>
        <form action={props.logoutAction}>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--line)] bg-white/60 px-4 text-sm font-semibold text-[color:var(--ink-soft)] transition hover:border-[color:var(--clay)]/30 hover:text-[color:var(--forest-strong)]"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
