import type { User } from "@cart/shared";
import Link from "next/link";

export function DashboardHeader(props: {
  user: User;
}) {
  const initial = (props.user.name ?? props.user.email ?? "M")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <header className="flex items-center justify-between gap-4 rounded-[1.75rem] border border-[color:var(--line)] bg-white/40 px-5 py-4 shadow-[var(--shadow)] backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--paper)]/82 font-display text-xl text-[color:var(--forest-strong)]">
          M
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--olive)]">
            Misen
          </div>
          <div className="text-sm text-[color:var(--ink-soft)]">
            Kitchen planning workspace
          </div>
        </div>
      </div>

      <Link
        href="/account/settings/overview"
        aria-label="Open account settings"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[color:var(--forest)] text-lg font-semibold text-[color:var(--paper)] transition hover:bg-[color:var(--forest-strong)]"
      >
        {initial}
      </Link>
    </header>
  );
}
