"use client";

import { use } from "react";
import { AccountDataContext } from "./context";
import { PreferencesForm } from "./preferences-form";

export function PreferencesSection() {
  const accountData = use(AccountDataContext);

  return (
    <PreferencesForm
      preferences={accountData.preferences}
      cuisines={accountData.cuisines}
      tags={accountData.systemTags}
    />
  );
}
