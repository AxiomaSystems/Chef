import type { User } from "@cart/shared";
import Link from "next/link";

function formatProviderLabel(provider: NonNullable<User["auth_providers"]>[number]) {
  return provider === "password" ? "Email" : "Google";
}

export function AccountSidebar(props: {
  user: User;
  logoutAction: () => Promise<void>;
}) {
  const initials = props.user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <aside className="border-b border-white/8 bg-[color:var(--forest-strong)] px-6 py-7 text-[color:var(--paper)] lg:min-h-full lg:border-b-0 lg:border-r lg:border-white/8 lg:px-7 lg:py-8">
      <div className="flex h-full flex-col justify-between gap-8">
        <div className="grid gap-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--paper-strong)]/72">
                Pantry identity
              </p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full border border-white/12 bg-white/10 text-lg font-semibold text-[color:var(--paper)]">
                  {initials || "U"}
                </div>
                <div>
                  <div className="text-lg font-semibold">{props.user.name}</div>
                  <div className="text-sm text-[color:var(--paper-strong)]/76">
                    {props.user.email}
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--paper)] transition hover:bg-white/14"
            >
              Back
            </Link>
          </div>

          <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--paper-strong)]/68">
                Connected auth
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(props.user.auth_providers ?? []).map((provider) => (
                  <span
                    key={provider}
                    className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--paper)]"
                  >
                    {formatProviderLabel(provider)}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-white/8 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--paper-strong)]/68">
                Account state
              </p>
              <div className="mt-3 text-sm leading-6 text-[color:var(--paper-strong)]/78">
                Onboarding complete. Preferences can now stay empty or evolve
                independently from setup.
              </div>
            </div>
          </div>
        </div>

        <form action={props.logoutAction}>
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/12 bg-white/8 px-5 text-sm font-semibold text-[color:var(--paper)] transition hover:bg-white/14"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
