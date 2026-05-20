"use client";

import { use } from "react";
import { AccountDataContext } from "./context";
import { ProfileForm } from "./profile-form";
import { StatsStrip } from "./stats-strip";

export function OverviewSection() {
  const accountData = use(AccountDataContext);

  return (
    <div className="grid gap-6">
      <StatsStrip stats={accountData.stats} />
      <ProfileForm user={accountData.user} />
    </div>
  );
}
