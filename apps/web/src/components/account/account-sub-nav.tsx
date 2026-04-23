"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/account/settings/overview",    label: "Overview",    icon: "person" },
  { href: "/account/settings/preferences", label: "Preferences", icon: "tune" },
  { href: "/account/settings/security",    label: "Security",    icon: "lock" },
];

export function AccountSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 bg-surface-container-low rounded-full p-1 w-fit">
      {NAV.map(({ href, label, icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-label-sm font-semibold transition-all ${
              active
                ? "bg-white text-on-surface shadow-sm"
                : "text-outline hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
            {label}
          </Link>
        );
      })}
    </div>
  );
}
