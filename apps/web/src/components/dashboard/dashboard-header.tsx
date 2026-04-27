import type { User } from "@cart/shared";
import Link from "next/link";

export function DashboardHeader(props: {
  user: User;
  activeSection?: "home" | "recipes" | "shopping";
}) {
  const initial = (props.user.name ?? props.user.email ?? "M")
    .trim()
    .charAt(0)
    .toUpperCase();
  const navItems = [
    { href: "/", label: "Home", key: "home" as const },
    { href: "/recipes", label: "Recipes", key: "recipes" as const },
    { href: "/shopping", label: "Shopping", key: "shopping" as const },
  ];

  return (
    <header className="flex items-center justify-between gap-4 rounded-[1.75rem] border border-[#d7c2b9] bg-white/40 px-5 py-4 shadow-sm backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d7c2b9] bg-[#faf9f6]/82 font-sans font-bold text-xl text-[#1a1c1a]">
            M
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#895032]">
              Misen
            </div>
            <div className="text-sm text-[#85736c]">
              Kitchen planning workspace
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => {
            const active = props.activeSection === item.key;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                  active
                    ? "border-[#895032] bg-[#895032] text-[#faf9f6]"
                    : "border-[#d7c2b9] bg-[#faf9f6]/72 text-[#85736c] hover:bg-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Link
        href="/account/settings/overview"
        aria-label="Open account settings"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#895032] text-lg font-semibold text-[#faf9f6] transition hover:bg-[#1a1c1a]"
      >
        {initial}
      </Link>
    </header>
  );
}
