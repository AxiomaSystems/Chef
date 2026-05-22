"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type {
  BaseRecipe,
  MealEventLabel,
  MealEventSourceType,
  MealEventStatus,
  MealEventWithRecipe,
  MealPlanRange,
  WeeklyNutritionTargets,
} from "@cart/shared";
import {
  createMealEventAction,
  createMealPlanCartAction,
  deleteMealEventAction,
  getMealPlanAction,
  updateMealEventAction,
} from "@/app/meal-plan/actions";
import { RecipeImage } from "@/components/ui/recipe-image";

type PlanView = "day" | "week" | "month";
type PickerMode = "recipe" | "manual";

type PickerState = {
  date: string;
  event?: MealEventWithRecipe;
} | null;

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MEAL_LABELS: { value: MealEventLabel; label: string; icon: string }[] = [
  { value: "breakfast", label: "Breakfast", icon: "wb_sunny" },
  { value: "lunch", label: "Lunch", icon: "restaurant" },
  { value: "dinner", label: "Dinner", icon: "dinner_dining" },
  { value: "snack", label: "Snack", icon: "bakery_dining" },
  { value: "prep", label: "Prep", icon: "skillet" },
  { value: "leftover", label: "Leftover", icon: "recycling" },
  { value: "custom", label: "Custom", icon: "edit_note" },
];
const MANUAL_EVENT_TYPES: {
  source: MealEventSourceType;
  label: MealEventLabel;
  title: string;
  icon: string;
}[] = [
  { source: "manual", label: "custom", title: "Manual", icon: "edit_note" },
  { source: "eat_out", label: "custom", title: "Eat out", icon: "restaurant" },
  {
    source: "leftover",
    label: "leftover",
    title: "Leftover",
    icon: "recycling",
  },
  { source: "prep", label: "prep", title: "Prep", icon: "skillet" },
];
const EVENT_STATUSES: MealEventStatus[] = [
  "planned",
  "cooked",
  "eaten",
  "skipped",
];
const WEEKLY_TARGETS = {
  calories: 14000,
  protein_g: 350,
  carbs_g: 1750,
  fat_g: 490,
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function fromDateKey(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getMonday(date: Date) {
  const next = new Date(date);
  const day = next.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setUTCDate(next.getUTCDate() + diff);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function getRangeForView(anchor: Date, view: PlanView) {
  if (view === "month") {
    const from = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1),
    );
    const to = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0),
    );
    return { from: toDateKey(from), to: toDateKey(to) };
  }

  const from = getMonday(anchor);
  const to = addDays(from, 6);
  return { from: toDateKey(from), to: toDateKey(to) };
}

function buildEmptyRange(from: string, to: string): MealPlanRange {
  const fromDate = fromDateKey(from);
  const toDate = fromDateKey(to);
  const dayCount =
    Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;

  return {
    from,
    to,
    days: Array.from({ length: dayCount }, (_, index) => ({
      date: toDateKey(addDays(fromDate, index)),
      events: [],
    })),
    events: [],
    grocery_summary: { items: [], item_count: 0 },
    nutrition_summary: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  };
}

function formatRangeLabel(plan: MealPlanRange, view: PlanView) {
  const from = fromDateKey(plan.from);
  const to = fromDateKey(plan.to);

  if (view === "month") {
    return `${MONTH_NAMES[from.getUTCMonth()]} ${from.getUTCFullYear()}`;
  }

  return `${MONTH_NAMES[from.getUTCMonth()]} ${from.getUTCDate()} - ${
    MONTH_NAMES[to.getUTCMonth()]
  } ${to.getUTCDate()}, ${to.getUTCFullYear()}`;
}

function labelConfig(label: MealEventLabel) {
  return MEAL_LABELS.find((entry) => entry.value === label) ?? MEAL_LABELS[2]!;
}

function eventRecipe(event: MealEventWithRecipe) {
  return event.recipe ?? null;
}

export function WeeklyMealPlan({
  recipes,
  initialMealPlan,
  weeklyNutritionTargets,
}: {
  recipes: BaseRecipe[];
  initialMealPlan: MealPlanRange;
  weeklyNutritionTargets?: WeeklyNutritionTargets;
}) {
  const router = useRouter();
  const todayKey = toDateKey(new Date());
  const [planView, setPlanView] = useState<PlanView>("day");
  const [anchorDate, setAnchorDate] = useState(() =>
    fromDateKey(initialMealPlan.from),
  );
  const [plan, setPlan] = useState(initialMealPlan);
  const [activeDate, setActiveDate] = useState(() => {
    const current = initialMealPlan.days.find((day) => day.date === todayKey);
    return (
      current?.date ?? initialMealPlan.days[0]?.date ?? initialMealPlan.from
    );
  });
  const [picker, setPicker] = useState<PickerState>(null);
  const [pickerMode, setPickerMode] = useState<PickerMode>("recipe");
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerLabel, setPickerLabel] = useState<MealEventLabel>("dinner");
  const [pickerSourceType, setPickerSourceType] =
    useState<MealEventSourceType>("manual");
  const [pickerDate, setPickerDate] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCustomLabel, setManualCustomLabel] = useState("");
  const [manualServings, setManualServings] = useState(1);
  const [manualNotes, setManualNotes] = useState("");
  const [manualStatus, setManualStatus] = useState<MealEventStatus>("planned");
  const [checkedGroceries, setCheckedGroceries] = useState<string[]>([]);
  const [excludedEventIds, setExcludedEventIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCartPending, startCartTransition] = useTransition();

  const range = useMemo(
    () => getRangeForView(anchorDate, planView),
    [anchorDate, planView],
  );

  useEffect(() => {
    if (plan.from === range.from && plan.to === range.to) {
      return;
    }

    let cancelled = false;
    setError(null);

    void getMealPlanAction(range.from, range.to).then((result) => {
      if (cancelled) return;

      if (result.error) {
        setPlan(buildEmptyRange(range.from, range.to));
        setError(result.error);
        return;
      }

      setPlan(result.mealPlan ?? buildEmptyRange(range.from, range.to));
    });

    return () => {
      cancelled = true;
    };
  }, [plan.from, plan.to, range.from, range.to]);

  const dayMap = useMemo(
    () => new Map(plan.days.map((day) => [day.date, day])),
    [plan.days],
  );

  useEffect(() => {
    if (!dayMap.has(activeDate) && plan.days[0]) {
      setActiveDate(plan.days[0].date);
    }
  }, [activeDate, dayMap, plan.days]);

  const activeDay = dayMap.get(activeDate) ?? plan.days[0];
  const recipeEvents = plan.events.filter((event) => event.recipe_id);
  const selectedCartEvents = recipeEvents.filter(
    (event) => !excludedEventIds.includes(event.id),
  );
  const usedRecipeIds = new Set(
    recipeEvents.map((event) => event.recipe_id).filter(Boolean),
  );
  const suggestedRecipe =
    recipes.find((recipe) => !usedRecipeIds.has(recipe.id)) ??
    recipes[0] ??
    null;
  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(pickerSearch.trim().toLowerCase()),
  );
  const nutritionTargets = {
    calories: weeklyNutritionTargets?.calories ?? WEEKLY_TARGETS.calories,
    protein_g: weeklyNutritionTargets?.protein_g ?? WEEKLY_TARGETS.protein_g,
    carbs_g: weeklyNutritionTargets?.carbs_g ?? WEEKLY_TARGETS.carbs_g,
    fat_g: weeklyNutritionTargets?.fat_g ?? WEEKLY_TARGETS.fat_g,
  };

  async function reloadPlan() {
    const result = await getMealPlanAction(range.from, range.to);

    if (result.error) {
      setError(result.error);
      return;
    }

    setPlan(result.mealPlan ?? buildEmptyRange(range.from, range.to));
    setError(null);
  }

  function shiftPeriod(delta: number) {
    setPicker(null);
    setAnchorDate((current) =>
      planView === "month"
        ? new Date(
            Date.UTC(
              current.getUTCFullYear(),
              current.getUTCMonth() + delta,
              1,
            ),
          )
        : addDays(current, delta * 7),
    );
  }

  function goToToday() {
    const today = new Date();
    setPicker(null);
    setAnchorDate(today);
    setActiveDate(toDateKey(today));
  }

  function openPicker(date: string, event?: MealEventWithRecipe) {
    setPicker({ date, event });
    setPickerLabel(event?.meal_label ?? "dinner");
    setPickerMode(event && !event.recipe_id ? "manual" : "recipe");
    setPickerSourceType(event?.source_type ?? "manual");
    setPickerDate(event?.date ?? date);
    setManualTitle(event?.title ?? "");
    setManualCustomLabel(event?.custom_label ?? "");
    setManualServings(event?.servings ?? 0);
    setManualNotes(event?.notes ?? "");
    setManualStatus(event?.status ?? "planned");
    setPickerSearch("");
  }

  function addOrSwapRecipe(recipe: BaseRecipe) {
    if (!picker || isPending) {
      return;
    }

    startTransition(async () => {
      const servings = Math.max(
        1,
        Math.round(manualServings || recipe.servings),
      );
      const action = picker.event
        ? updateMealEventAction(picker.event.id, {
            date: pickerDate || picker.date,
            meal_label: pickerLabel,
            custom_label:
              pickerLabel === "custom" ? manualCustomLabel.trim() : "",
            recipe_id: recipe.id,
            source_type: "recipe",
            title: recipe.name,
            servings,
            status: manualStatus,
            notes: manualNotes.trim(),
          })
        : createMealEventAction({
            date: pickerDate || picker.date,
            meal_label: pickerLabel,
            custom_label:
              pickerLabel === "custom" ? manualCustomLabel.trim() : undefined,
            source_type: "recipe",
            recipe_id: recipe.id,
            title: recipe.name,
            servings,
            status: manualStatus,
            notes: manualNotes.trim() || undefined,
          });
      const result = await action;

      if (result.error) {
        setError(result.error);
        return;
      }

      setPicker(null);
      await reloadPlan();
    });
  }

  function saveManualEvent() {
    if (!picker || isPending) {
      return;
    }

    const title = manualTitle.trim();

    if (!title) {
      setError("Give this meal a title before saving it.");
      return;
    }

    startTransition(async () => {
      const payload = {
        date: pickerDate || picker.date,
        meal_label: pickerLabel,
        custom_label: pickerLabel === "custom" ? manualCustomLabel.trim() : "",
        source_type: pickerSourceType,
        recipe_id: "",
        title,
        servings: Math.max(1, Math.round(manualServings || 1)),
        status: manualStatus,
        notes: manualNotes.trim(),
      };
      const result = picker.event
        ? await updateMealEventAction(picker.event.id, payload)
        : await createMealEventAction(payload);

      if (result.error) {
        setError(result.error);
        return;
      }

      setPicker(null);
      await reloadPlan();
    });
  }

  function removeEvent(event: MealEventWithRecipe) {
    if (isPending) return;

    startTransition(async () => {
      const result = await deleteMealEventAction(event.id);

      if (result.error) {
        setError(result.error);
        return;
      }

      await reloadPlan();
    });
  }

  function updateEventStatus(
    event: MealEventWithRecipe,
    status: MealEventStatus,
  ) {
    if (isPending || event.status === status) return;

    startTransition(async () => {
      const result = await updateMealEventAction(event.id, { status });

      if (result.error) {
        setError(result.error);
        return;
      }

      await reloadPlan();
    });
  }

  function addSuggestedRecipe() {
    if (!suggestedRecipe) return;

    startTransition(async () => {
      const result = await createMealEventAction({
        date: activeDate,
        meal_label: "dinner",
        source_type: "recipe",
        recipe_id: suggestedRecipe.id,
        title: suggestedRecipe.name,
        servings: suggestedRecipe.servings,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      await reloadPlan();
    });
  }

  function toggleCartEvent(eventId: string) {
    setExcludedEventIds((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId],
    );
    setCartError(null);
  }

  function generateCart() {
    if (selectedCartEvents.length === 0 || isCartPending) {
      setCartError("Choose at least one planned recipe to generate a cart.");
      return;
    }

    startCartTransition(async () => {
      const result = await createMealPlanCartAction({
        from: plan.from,
        to: plan.to,
        event_ids: selectedCartEvents.map((event) => event.id),
        retailer: "kroger",
        mode: "replace_active",
      });

      if (result.error || !result.result?.cart.id) {
        setCartError(result.error ?? "Unable to generate this cart.");
        return;
      }

      router.push(`/carts/${result.result.cart.id}`);
    });
  }

  return (
    <div className="space-y-6" onClick={() => setPicker(null)}>
      {error ? (
        <div className="rounded-2xl border border-[#d37c6b]/25 bg-[#fbe6e1] px-4 py-3 text-body-sm text-[#8f3a2f]">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface">
            Meal Plan
          </h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            {formatRangeLabel(plan, planView)} - {plan.events.length} planned
            event{plan.events.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="grid grid-cols-3 rounded-full bg-surface-container-low p-1">
            {(["day", "week", "month"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPlanView(view);
                }}
                className={`rounded-full px-3 py-1.5 text-label-sm font-semibold capitalize transition-all ${
                  planView === view
                    ? "bg-white text-on-surface shadow-sm"
                    : "text-outline hover:text-on-surface"
                }`}
              >
                {view}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              shiftPeriod(-1);
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-outline-variant/30 hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goToToday();
            }}
            className="rounded-full border border-outline-variant/30 px-3 py-1.5 text-label-sm text-on-surface-variant hover:bg-surface-container-low"
          >
            Today
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              shiftPeriod(1);
            }}
            className="grid h-9 w-9 place-items-center rounded-full border border-outline-variant/30 hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {planView === "day" && activeDay ? (
        <section className="rounded-[28px] border border-outline-variant/25 bg-white p-4 shadow-sm sm:p-5">
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
            {plan.days.map((day) => {
              const date = fromDateKey(day.date);
              const active = day.date === activeDate;
              const isToday = day.date === todayKey;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveDate(day.date);
                  }}
                  className={`flex min-w-16 flex-col items-center rounded-2xl border px-3 py-2 transition-colors ${
                    active
                      ? "border-primary bg-primary text-on-primary"
                      : isToday
                        ? "border-primary/30 bg-primary-surface text-primary"
                        : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {DAY_LABELS[(date.getUTCDay() + 6) % 7]}
                  </span>
                  <span className="mt-0.5 text-body-lg font-bold">
                    {date.getUTCDate()}
                  </span>
                  <span className="mt-1 text-[10px]">
                    {day.events.length} event
                    {day.events.length === 1 ? "" : "s"}
                  </span>
                </button>
              );
            })}
          </div>

          <DayColumn
            day={activeDay}
            onAdd={() => openPicker(activeDay.date)}
            onSwap={(event) => openPicker(activeDay.date, event)}
            onRemove={removeEvent}
            onStatus={updateEventStatus}
          />
        </section>
      ) : null}

      {planView === "week" ? (
        <section className="overflow-x-auto rounded-[28px] border border-outline-variant/25 bg-white p-4 shadow-sm">
          <div className="grid min-w-[760px] grid-cols-7 gap-3">
            {plan.days.map((day) => (
              <DayColumn
                key={day.date}
                day={day}
                compact
                onAdd={() => openPicker(day.date)}
                onSwap={(event) => openPicker(day.date, event)}
                onRemove={removeEvent}
                onStatus={updateEventStatus}
              />
            ))}
          </div>
        </section>
      ) : null}

      {planView === "month" ? (
        <section className="rounded-[28px] border border-outline-variant/25 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {plan.days.map((day) => {
              const date = fromDateKey(day.date);

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveDate(day.date);
                    setPlanView("day");
                  }}
                  className={`min-h-28 rounded-2xl border p-2 text-left transition-colors hover:border-primary/45 ${
                    day.date === todayKey
                      ? "border-primary/40 bg-primary-surface/50"
                      : "border-outline-variant/25 bg-surface-container-low/30"
                  }`}
                >
                  <p className="text-label-sm font-bold text-on-surface">
                    {date.getUTCDate()}
                  </p>
                  <div className="mt-2 space-y-1">
                    {day.events.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="truncate rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-on-surface-variant"
                      >
                        {event.title}
                      </div>
                    ))}
                    {day.events.length > 3 ? (
                      <p className="px-1 text-[10px] font-semibold text-primary">
                        +{day.events.length - 3} more
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        <SummaryCard
          title="Grocery Impact"
          badge={`${plan.grocery_summary.item_count} items`}
        >
          {plan.grocery_summary.items.length === 0 ? (
            <EmptySummary
              icon="shopping_basket"
              text="Plan meals to see what needs buying."
            />
          ) : (
            <div className="space-y-2.5">
              {plan.grocery_summary.items.slice(0, 6).map((item) => {
                const key = `${item.canonical_ingredient}:${item.unit}`;
                const checked = checkedGroceries.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setCheckedGroceries((current) =>
                        checked
                          ? current.filter((itemKey) => itemKey !== key)
                          : [...current, key],
                      )
                    }
                    className="flex w-full items-center gap-2.5 text-left"
                  >
                    <span
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                        checked
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/50 bg-white"
                      }`}
                    >
                      {checked ? (
                        <span className="material-symbols-outlined text-[12px]">
                          check
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`text-body-sm capitalize ${
                        checked
                          ? "text-outline line-through"
                          : "text-on-surface"
                      }`}
                    >
                      {item.canonical_ingredient}
                      <span className="ml-1 text-outline">
                        x{Math.ceil(item.total_amount)}
                        {item.unit ? ` ${item.unit}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={generateCart}
            disabled={selectedCartEvents.length === 0 || isCartPending}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-label-md font-semibold text-on-primary transition-colors hover:bg-on-primary-container disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">
              shopping_cart
            </span>
            {isCartPending ? "Generating..." : "Generate active cart"}
          </button>
          {cartError ? (
            <p className="mt-2 text-center text-body-sm text-error">
              {cartError}
            </p>
          ) : null}
        </SummaryCard>

        <SummaryCard title="Nutrition Trend">
          {plan.events.length === 0 ? (
            <EmptySummary
              icon="nutrition"
              text="Plan meals to see nutrition progress."
            />
          ) : (
            <NutritionBars
              values={plan.nutrition_summary}
              targets={nutritionTargets}
            />
          )}
        </SummaryCard>

        <SummaryCard
          title="Cart Selection"
          badge={`${selectedCartEvents.length} selected`}
        >
          {recipeEvents.length === 0 ? (
            <EmptySummary
              icon="event_busy"
              text="Recipe meals will appear here."
            />
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {recipeEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => toggleCartEvent(event.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-2 text-left ${
                    excludedEventIds.includes(event.id)
                      ? "border-outline-variant/20 opacity-55"
                      : "border-primary/25 bg-primary-surface/35"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    {excludedEventIds.includes(event.id)
                      ? "check_box_outline_blank"
                      : "check_box"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-semibold text-on-surface">
                      {event.title}
                    </span>
                    <span className="text-[11px] text-outline">
                      {event.date} - {labelConfig(event.meal_label).label}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </SummaryCard>
      </div>

      {suggestedRecipe ? (
        <div className="rounded-[24px] bg-[#fe8e17] p-5 text-white">
          <span className="inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest">
            Suggested pick
          </span>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-title-lg font-bold">{suggestedRecipe.name}</p>
              <p className="mt-1 line-clamp-2 max-w-2xl text-body-sm text-white/80">
                {suggestedRecipe.description}
              </p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                addSuggestedRecipe();
              }}
              className="rounded-full bg-white/20 px-4 py-2 text-label-md font-semibold transition-colors hover:bg-white/30"
            >
              Add to active day
            </button>
          </div>
        </div>
      ) : null}

      {picker ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-0 py-0 sm:items-center sm:px-4 sm:py-6"
          onClick={() => setPicker(null)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-h-[86vh] sm:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 border-b border-outline-variant/20 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-label-sm font-bold uppercase tracking-widest text-primary">
                    {picker.event ? "Edit meal" : "Add meal"}
                  </p>
                  <h3 className="text-title-lg font-bold text-on-surface">
                    {pickerDate || picker.date}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPicker(null)}
                  className="grid h-10 w-10 place-items-center rounded-full text-outline hover:bg-surface-container-low"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 rounded-full bg-surface-container-low p-1">
                {(["recipe", "manual"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPickerMode(mode)}
                    className={`rounded-full px-3 py-2 text-label-sm font-semibold capitalize transition-colors ${
                      pickerMode === mode
                        ? "bg-white text-on-surface shadow-sm"
                        : "text-outline"
                    }`}
                  >
                    {mode === "recipe" ? "Recipe" : "Manual"}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_8rem]">
                <label className="text-label-sm font-semibold text-on-surface-variant">
                  Date
                  <input
                    type="date"
                    value={pickerDate}
                    onChange={(event) => setPickerDate(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-outline-variant/40 bg-white px-3 py-2.5 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="text-label-sm font-semibold text-on-surface-variant">
                  Servings
                  <input
                    type="number"
                    min={1}
                    value={manualServings || ""}
                    onChange={(event) =>
                      setManualServings(Number(event.target.value) || 0)
                    }
                    className="mt-1 w-full rounded-2xl border border-outline-variant/40 bg-white px-3 py-2.5 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>

              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {MEAL_LABELS.map((label) => (
                  <button
                    key={label.value}
                    type="button"
                    onClick={() => setPickerLabel(label.value)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-label-sm font-semibold ${
                      pickerLabel === label.value
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/40 text-on-surface-variant"
                    }`}
                  >
                    {label.label}
                  </button>
                ))}
              </div>

              {pickerLabel === "custom" ? (
                <input
                  value={manualCustomLabel}
                  onChange={(event) => setManualCustomLabel(event.target.value)}
                  placeholder="Custom label, e.g. Post-workout"
                  className="mt-2 w-full rounded-2xl border border-outline-variant/40 bg-white px-4 py-2.5 text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {pickerMode === "recipe" ? (
                <>
                  <input
                    autoFocus
                    value={pickerSearch}
                    onChange={(event) => setPickerSearch(event.target.value)}
                    placeholder="Search recipes..."
                    className="mb-4 w-full rounded-2xl border border-outline-variant/40 bg-surface-container-low px-4 py-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {filteredRecipes.length === 0 ? (
                    <p className="py-10 text-center text-body-sm text-outline">
                      No recipes found.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {filteredRecipes.map((recipe) => (
                        <button
                          key={recipe.id}
                          type="button"
                          onClick={() => addOrSwapRecipe(recipe)}
                          disabled={isPending}
                          className="flex items-center gap-3 rounded-2xl border border-outline-variant/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary-surface/40 disabled:opacity-60"
                        >
                          <RecipeImage
                            src={recipe.cover_image_url}
                            alt={recipe.name}
                            seed={recipe.id}
                            className="h-14 w-14 shrink-0 overflow-hidden rounded-xl"
                            imgClassName="h-14 w-14 object-cover"
                          />
                          <span className="min-w-0">
                            <span className="line-clamp-2 text-body-sm font-bold text-on-surface">
                              {recipe.name}
                            </span>
                            <span className="text-[11px] text-outline">
                              {recipe.servings} serving
                              {recipe.servings === 1 ? "" : "s"}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {MANUAL_EVENT_TYPES.map((type) => (
                      <button
                        key={type.source}
                        type="button"
                        onClick={() => {
                          setPickerSourceType(type.source);
                          setPickerLabel(type.label);
                          setManualTitle((current) => current || type.title);
                        }}
                        className={`rounded-2xl border p-3 text-left transition-colors ${
                          pickerSourceType === type.source
                            ? "border-primary bg-primary-surface text-primary"
                            : "border-outline-variant/30 text-on-surface-variant"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {type.icon}
                        </span>
                        <span className="mt-1 block text-label-sm font-bold">
                          {type.title}
                        </span>
                      </button>
                    ))}
                  </div>

                  <input
                    value={manualTitle}
                    onChange={(event) => setManualTitle(event.target.value)}
                    placeholder="Title, e.g. Dinner out, leftovers, prep rice"
                    className="w-full rounded-2xl border border-outline-variant/40 bg-white px-4 py-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />

                  <textarea
                    value={manualNotes}
                    onChange={(event) => setManualNotes(event.target.value)}
                    placeholder="Notes for this meal..."
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-outline-variant/40 bg-white px-4 py-3 text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />

                  <div className="flex flex-wrap gap-2">
                    {EVENT_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setManualStatus(status)}
                        className={`rounded-full border px-3 py-1.5 text-label-sm font-semibold capitalize ${
                          manualStatus === status
                            ? "border-primary bg-primary text-on-primary"
                            : "border-outline-variant/40 text-on-surface-variant"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={saveManualEvent}
                    disabled={isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-label-md font-semibold text-on-primary transition-colors hover:bg-on-primary-container disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      check
                    </span>
                    {isPending ? "Saving..." : "Save meal"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DayColumn({
  day,
  compact = false,
  onAdd,
  onSwap,
  onRemove,
  onStatus,
}: {
  day: MealPlanRange["days"][number];
  compact?: boolean;
  onAdd: () => void;
  onSwap: (event: MealEventWithRecipe) => void;
  onRemove: (event: MealEventWithRecipe) => void;
  onStatus: (event: MealEventWithRecipe, status: MealEventStatus) => void;
}) {
  const date = fromDateKey(day.date);

  return (
    <div
      className={`rounded-3xl border border-outline-variant/20 bg-surface-container-low/35 p-3 ${
        compact ? "min-h-[26rem]" : ""
      }`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            {DAY_LABELS[(date.getUTCDay() + 6) % 7]}
          </p>
          <h3 className="text-title-md font-bold text-on-surface">
            {MONTH_NAMES[date.getUTCMonth()]} {date.getUTCDate()}
          </h3>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="grid h-9 w-9 place-items-center rounded-full bg-white text-primary shadow-sm"
        >
          <span className="material-symbols-outlined text-[19px]">add</span>
        </button>
      </div>

      <div className="space-y-2">
        {day.events.length === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline-variant/35 bg-white/70 text-label-md font-semibold text-outline"
          >
            <span className="material-symbols-outlined text-[22px]">add</span>
            Add meal
          </button>
        ) : (
          day.events.map((event) => (
            <MealEventCard
              key={event.id}
              event={event}
              onSwap={() => onSwap(event)}
              onRemove={() => onRemove(event)}
              onStatus={(status) => onStatus(event, status)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MealEventCard({
  event,
  onSwap,
  onRemove,
  onStatus,
}: {
  event: MealEventWithRecipe;
  onSwap: () => void;
  onRemove: () => void;
  onStatus: (status: MealEventStatus) => void;
}) {
  const recipe = eventRecipe(event);
  const label = labelConfig(event.meal_label);

  return (
    <article className="group overflow-hidden rounded-2xl border border-outline-variant/20 bg-white shadow-sm">
      {recipe ? (
        <RecipeImage
          src={recipe.cover_image_url}
          alt={event.title}
          seed={recipe.id}
          className="h-24 w-full"
          imgClassName="h-24 w-full object-cover"
        />
      ) : null}
      <div className="p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-primary">
            {label.icon}
          </span>
          <span className="rounded-full bg-primary-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            {event.meal_label === "custom" && event.custom_label
              ? event.custom_label
              : label.label}
          </span>
        </div>
        <h4 className="line-clamp-2 text-body-md font-bold text-on-surface">
          {event.title}
        </h4>
        <p className="mt-1 text-[11px] text-outline">
          {event.servings} serving{event.servings === 1 ? "" : "s"} -{" "}
          {event.status}
        </p>
        {event.notes ? (
          <p className="mt-2 line-clamp-2 text-[11px] text-on-surface-variant">
            {event.notes}
          </p>
        ) : null}
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {EVENT_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={onStatus.bind(null, status)}
              className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold capitalize ${
                event.status === status
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant/35 text-outline"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onSwap}
            className="rounded-full border border-outline-variant/40 px-3 py-1.5 text-label-sm font-semibold text-on-surface-variant"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-[#d37c6b]/30 px-3 py-1.5 text-label-sm font-semibold text-[#8f3a2f]"
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-outline-variant/25 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-body-lg font-bold text-on-surface">{title}</h3>
        {badge ? (
          <span className="rounded-full bg-secondary-container px-2.5 py-1 text-label-sm text-on-secondary-container">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptySummary({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="py-6 text-center">
      <span className="material-symbols-outlined text-[36px] text-outline-variant">
        {icon}
      </span>
      <p className="mt-2 text-body-sm text-outline">{text}</p>
    </div>
  );
}

function NutritionBars({
  values,
  targets,
}: {
  values: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}) {
  return (
    <div className="space-y-4">
      {[
        {
          label: "Calories",
          value: values.calories,
          target: targets.calories,
          unit: " kcal",
          color: "bg-[#ef4444]",
        },
        {
          label: "Protein",
          value: values.protein_g,
          target: targets.protein_g,
          unit: "g",
          color: "bg-[#fe8e17]",
        },
        {
          label: "Carbs",
          value: values.carbs_g,
          target: targets.carbs_g,
          unit: "g",
          color: "bg-[#3b82f6]",
        },
        {
          label: "Fats",
          value: values.fat_g,
          target: targets.fat_g,
          unit: "g",
          color: "bg-[#22c55e]",
        },
      ].map(({ label, value, target, unit, color }) => {
        const safeTarget = target > 0 ? target : 1;
        const percent = Math.min(100, Math.round((value / safeTarget) * 100));

        return (
          <div key={label}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-body-sm text-on-surface-variant">
                {label}
              </span>
              <span className="text-label-sm font-bold text-on-surface">
                {percent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-container-low">
              <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-outline">
              {Math.round(value)}
              {unit} of {target}
              {unit} goal
            </p>
          </div>
        );
      })}
    </div>
  );
}
