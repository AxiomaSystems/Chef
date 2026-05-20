"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export function TopBar({ title, showBack, actions }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/dashboard" || pathname === "/";
  const shouldShowBack = showBack ?? !isHome;

  const pageTitle =
    title ??
    (pathname.startsWith("/dashboard")
      ? "Home"
      : pathname.startsWith("/recipes")
        ? "Recipes"
        : pathname.startsWith("/create")
          ? "Create"
          : pathname.startsWith("/shopping")
            ? "Cart"
            : pathname.startsWith("/chef-ai")
              ? "Butter Me AI"
              : pathname.startsWith("/account")
                ? "Account"
                : "Butter Me");

  return (
    <header className="flex items-center justify-between px-6 py-3 sticky top-0 z-40 bg-surface-bright/95 backdrop-blur-sm border-b border-outline-variant/30">
      <div className="flex items-center gap-3">
        {shouldShowBack && (
          <button
            type="button"
            onClick={() => router.back()}
            className="grid h-10 w-10 place-items-center rounded-full hover:bg-primary-surface transition-colors"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined text-[22px] leading-none text-on-surface">
              arrow_back
            </span>
          </button>
        )}
        {/* Brand visible only on mobile (lg shows sidebar) */}
        <Link
          href="/dashboard"
          className="lg:hidden flex items-center gap-2 text-xl font-black text-primary-fixed-dim"
        >
          <img
            src="/icon-192.png"
            alt=""
            className="h-8 w-8 rounded-lg"
            width={32}
            height={32}
          />
          <span>Butter Me</span>
        </Link>
        {title && (
          <span className="hidden lg:block text-headline-sm text-on-surface">
            {pageTitle}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <Link
          href="/account/settings/overview"
          className="p-2 rounded-full hover:bg-primary-surface transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface-variant">
            account_circle
          </span>
        </Link>
      </div>
    </header>
  );
}
