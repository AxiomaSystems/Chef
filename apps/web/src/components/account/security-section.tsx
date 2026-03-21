"use client";

import { use } from "react";
import { AccountDataContext } from "./context";
import { SecurityForm } from "./security-form";

export function SecuritySection() {
  const accountData = use(AccountDataContext);

  return <SecurityForm user={accountData.user} />;
}
