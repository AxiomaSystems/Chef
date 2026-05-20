"use client";

import { use } from "react";
import { AccountDataContext } from "./context";
import { AiLimitsCard } from "./ai-limits-card";

export function AiUsageSection() {
  const accountData = use(AccountDataContext);

  return <AiLimitsCard status={accountData.aiLimits} />;
}
