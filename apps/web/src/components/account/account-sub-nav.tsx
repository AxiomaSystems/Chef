"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/account/settings/overview", label: "Overview", icon: "person" },
  { href: "/account/settings/preferences", label: "Preferences", icon: "tune" },
  {
    href: "/account/settings/payment",
    label: "Payment",
    icon: "credit_card",
  },
  { href: "/account/settings/security", label: "Security", icon: "lock" },
  {
    href: "/account/settings/ai-usage",
    label: "AI usage",
    icon: "auto_awesome",
  },
];

export function AccountSubNav() {
  const pathname = usePathname();

  return (
    <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto bg-surface-container-low px-4 py-1 sm:mx-0 sm:w-fit sm:rounded-full sm:p-1">
      {NAV.map(({ href, label, icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-label-sm font-semibold transition-all sm:px-4 ${
              active
                ? "bg-white text-on-surface shadow-sm"
                : "text-outline hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {icon}
            </span>
            {label}
          </Link>
        );
      })}
    </div>
  );
}
