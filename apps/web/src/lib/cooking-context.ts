import type { KitchenInventoryItem, UserProfileMemory } from "@cart/shared";

export type CookingContext = {
  memorySummary?: string;
  dietaryRules: string[];
  goals: string[];
  kitchen: string[];
  pantry: string[];
  inventory: string[];
};

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

export function buildCookingContext(
  profileMemory: UserProfileMemory | null | undefined,
  inventoryItems: KitchenInventoryItem[],
): CookingContext {
  const summary = profileMemory?.summary;
  const preferences = profileMemory?.preferences;
  const activeRules =
    profileMemory?.food_rules.filter((rule) => rule.active) ?? [];
  const hardRules = activeRules
    .filter((rule) => rule.strictness === "hard")
    .map((rule) => `${rule.action}: ${rule.label}`)
    .slice(0, 8);
  const softRules = activeRules
    .filter((rule) => rule.strictness !== "hard")
    .map((rule) => `${rule.action}: ${rule.label}`)
    .slice(0, 8);

  const goals =
    profileMemory?.goals
      .filter((goal) => goal.active)
      .sort((a, b) => a.priority - b.priority)
      .map((goal) => `${humanize(goal.goal)} (${goal.timeframe})`)
      .slice(0, 5) ?? [];

  const kitchen = [
    preferences?.cooking_skill_level
      ? `skill: ${humanize(preferences.cooking_skill_level)}`
      : undefined,
    preferences?.preferred_cooking_time
      ? `time: ${humanize(preferences.preferred_cooking_time)}`
      : undefined,
    ...(preferences?.available_appliances?.slice(0, 8).map(humanize) ?? []),
  ].filter(Boolean) as string[];

  const pantry =
    profileMemory?.pantry_staples
      .map((item) => item.canonical_name)
      .slice(0, 12) ??
    summary?.pantry.labels.slice(0, 12) ??
    [];

  const inventory = inventoryItems
    .filter(
      (item) =>
        item.review_status === "active" || item.review_status === "pending",
    )
    .map((item) => {
      const amount =
        item.estimated_amount && item.unit
          ? `${item.estimated_amount} ${item.unit} `
          : "";
      return `${amount}${item.display_name}`;
    })
    .slice(0, 16);

  return {
    memorySummary: [
      summary?.household?.label,
      summary?.taste.spice_level
        ? `spice: ${humanize(summary.taste.spice_level)}`
        : undefined,
      summary?.kitchen.skill_level
        ? `skill: ${humanize(summary.kitchen.skill_level)}`
        : undefined,
      summary?.shopping.location_label
        ? `shops near ${summary.shopping.location_label}`
        : undefined,
    ]
      .filter(Boolean)
      .join("; "),
    dietaryRules: [...hardRules, ...softRules].slice(0, 12),
    goals,
    kitchen,
    pantry,
    inventory,
  };
}

export function stringifyCookingContext(
  context: CookingContext | null | undefined,
) {
  if (!context) return "No user cooking context was loaded.";
  return [
    context.memorySummary ? `Memory: ${context.memorySummary}` : null,
    context.dietaryRules.length
      ? `Rules: ${context.dietaryRules.join(", ")}`
      : null,
    context.goals.length ? `Goals: ${context.goals.join(", ")}` : null,
    context.kitchen.length ? `Kitchen: ${context.kitchen.join(", ")}` : null,
    context.pantry.length
      ? `Pantry staples: ${context.pantry.join(", ")}`
      : null,
    context.inventory.length
      ? `Inventory: ${context.inventory.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
