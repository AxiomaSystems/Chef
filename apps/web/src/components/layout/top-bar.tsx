"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export function TopBar({ title, showBack, actions }: TopBarProps) {
  const pathname = usePathname();

  const pageTitle =
    title ??
    (pathname.startsWith("/dashboard") ? "Home" :
     pathname.startsWith("/recipes") ? "Recipes" :
     pathname.startsWith("/shopping") ? "Shopping" :
     pathname.startsWith("/account") ? "Account" : "Chef");

  return (
    <header className="flex items-center justify-between px-6 py-3 sticky top-0 z-40 bg-surface-bright/95 backdrop-blur-sm border-b border-outline-variant/30">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => history.back()}
            className="p-2 rounded-full hover:bg-primary-surface transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
        )}
        {/* Brand visible only on mobile (lg shows sidebar) */}
        <Link href="/dashboard" className="lg:hidden text-xl font-black text-primary-fixed-dim">
          Chef
        </Link>
        {title && (
          <span className="hidden lg:block text-headline-sm text-on-surface">{pageTitle}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <Link
          href="/account/settings/overview"
          className="p-2 rounded-full hover:bg-primary-surface transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface-variant">account_circle</span>
        </Link>
      </div>
    </header>
  );
}
