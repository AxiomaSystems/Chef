"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  BaseRecipe,
  CreateMealEventRequest,
  MealEvent,
  MealPlanMealLabel,
  MealPlanRange,
  MealPlanSourceType,
  MealPlanEventStatus,
  WeeklyNutritionTargets,
} from "@cart/shared";
import {
  createMealEventAction,
  deleteMealEventAction,
  generateMealPlanCartAction,
  getMealPlanRangeAction,
  updateMealEventAction,
} from "@/app/meal-plan/actions";
import { RecipeImage } from "@/components/ui/recipe-image";

type PlanView = "day" | "week" | "month";

type EditorState = {
  mode: "create" | "edit";
  event?: MealEvent;
  date: string;
};

const MEAL_LABELS: { value: MealPlanMealLabel; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "prep", label: "Prep" },
  { value: "leftover", label: "Leftover" },
  { value: "custom", label: "Custom" },
];

const SOURCE_TYPES: { value: MealPlanSourceType; label: string }[] = [
  { value: "recipe", label: "Recipe" },
  { value: "manual", label: "Manual" },
  { value: "eat_out", label: "Eat out" },
  { value: "leftover", label: "Leftover" },
  { value: "prep", label: "Prep" },
];

const STATUSES: { value: MealPlanEventStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "cooked", label: "Cooked" },
  { value: "eaten", label: "Eaten" },
  { value: "skipped", label: "Skipped" },
];

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

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_TARGETS = {
  calories: 14000,
  protein_g: 350,
  carbs_g: 1750,
  fat_g: 490,
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function getMonday(date: Date) {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getRangeForWeek(start: Date) {
  const fromDate = getMonday(start);
  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + 6);
  return {
    from: toDateKey(fromDate),
    to: toDateKey(toDate),
  };
}

function buildEmptyRange(from: string, to: string): MealPlanRange {
  const start = parseDateKey(from);
  return {
    from,
    to,
    days: Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      return {
        date: toDateKey(date),
        events: [],
      };
    }),
    events: [],
    grocery_summary: [],
    nutrition_summary: {},
  };
}

function isMealPlanRange(
  value: MealPlanRange | undefined,
): value is MealPlanRange {
  return !!(
    value &&
    typeof value.from === "string" &&
    typeof value.to === "string" &&
    Array.isArray(value.days) &&
    value.days.every(
      (day) => typeof day.date === "string" && Array.isArray(day.events),
    )
  );
}

function labelText(value: MealPlanMealLabel) {
  return MEAL_LABELS.find((item) => item.value === value)?.label ?? value;
}

function sourceText(value: MealPlanSourceType) {
  return SOURCE_TYPES.find((item) => item.value === value)?.label ?? value;
}

function statusText(value: MealPlanEventStatus) {
  return STATUSES.find((item) => item.value === value)?.label ?? value;
}

function formatDateLabel(dateKey: string) {
  const date = parseDateKey(dateKey);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

function formatRangeLabel(from: string, to: string) {
  const start = parseDateKey(from);
  const end = parseDateKey(to);
  return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} - ${
    MONTH_NAMES[end.getMonth()]
  } ${end.getDate()}, ${end.getFullYear()}`;
}

function eventSortValue(event: MealEvent) {
  const order: Record<MealPlanMealLabel, number> = {
    breakfast: 1,
    lunch: 2,
    dinner: 3,
    snack: 4,
    prep: 5,
    leftover: 6,
    custom: 7,
  };
  return order[event.meal_label] ?? 99;
}

function recipeTitle(recipe?: BaseRecipe) {
  return recipe?.name ?? "";
}

function normalizeEvent(input: MealEvent): MealEvent {
  return {
    ...input,
    status: input.status ?? "planned",
    title: input.title || input.recipe?.name || "Meal",
  };
}

function rangeWithEvent(range: MealPlanRange, event: MealEvent) {
  const normalized = normalizeEvent(event);
  const events = [
    ...range.events.filter((item) => item.id !== normalized.id),
    normalized,
  ].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || eventSortValue(a) - eventSortValue(b),
  );

  return {
    ...range,
    events,
    days: range.days.map((day) => ({
      ...day,
      events: events
        .filter((item) => item.date === day.date)
        .sort((a, b) => eventSortValue(a) - eventSortValue(b)),
    })),
  };
}

function rangeWithoutEvent(range: MealPlanRange, eventId: string) {
  const events = range.events.filter((event) => event.id !== eventId);
  return {
    ...range,
    events,
    days: range.days.map((day) => ({
      ...day,
      events: day.events.filter((event) => event.id !== eventId),
    })),
  };
}

function monthDays(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = getMonday(first);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    return date;
  });
}

function statusClasses(status: MealPlanEventStatus) {
  if (status === "eaten") return "bg-[#e7f4ef] text-[#24664f]";
  if (status === "cooked") return "bg-[#fff0d9] text-[#8b5300]";
  if (status === "skipped") return "bg-[#f8e8e5] text-[#a14739]";
  return "bg-[#eef7f7] text-[#2f7277]";
}

function sourceIcon(sourceType: MealPlanSourceType) {
  if (sourceType === "recipe") return "restaurant";
  if (sourceType === "eat_out") return "storefront";
  if (sourceType === "leftover") return "history";
  if (sourceType === "prep") return "countertops";
  return "edit_note";
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
  const fallbackWeek = getRangeForWeek(new Date());
  const initialRange = isMealPlanRange(initialMealPlan)
    ? initialMealPlan
    : buildEmptyRange(fallbackWeek.from, fallbackWeek.to);
  const [range, setRange] = useState<MealPlanRange>(initialRange);
  const [activeDate, setActiveDate] = useState(
    initialRange.days.find((day) => day.date === todayKey)?.date ??
      initialRange.days[0]?.date ??
      initialRange.from,
  );
  const [view, setView] = useState<PlanView>("day");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isLoadingRange, startLoadingRange] = useTransition();
  const [isGeneratingCart, startGeneratingCart] = useTransition();

  const recipeById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe])),
    [recipes],
  );
  const recipeEvents = useMemo(
    () =>
      range.events.filter(
        (event) => event.source_type === "recipe" && event.recipe_id,
      ),
    [range.events],
  );
  const activeDay =
    range.days.find((day) => day.date === activeDate) ?? range.days[0];
  const nutritionTargets = {
    calories: weeklyNutritionTargets?.calories ?? DEFAULT_TARGETS.calories,
    protein_g: weeklyNutritionTargets?.protein_g ?? DEFAULT_TARGETS.protein_g,
    carbs_g: weeklyNutritionTargets?.carbs_g ?? DEFAULT_TARGETS.carbs_g,
    fat_g: weeklyNutritionTargets?.fat_g ?? DEFAULT_TARGETS.fat_g,
  };

  useEffect(() => {
    setSelectedEventIds(recipeEvents.map((event) => event.id));
  }, [recipeEvents]);

  function loadWeekFrom(date: Date) {
    const nextRange = getRangeForWeek(date);
    startLoadingRange(async () => {
      setError(null);
      const result = await getMealPlanRangeAction(nextRange.from, nextRange.to);
      if (result.error || !result.mealPlan) {
        setRange(buildEmptyRange(nextRange.from, nextRange.to));
        setActiveDate(nextRange.from);
        setError(result.error ?? "Unable to load this meal plan.");
        return;
      }

      const nextPlan = isMealPlanRange(result.mealPlan)
        ? result.mealPlan
        : buildEmptyRange(nextRange.from, nextRange.to);
      setRange(nextPlan);
      setActiveDate(
        nextPlan.days.find((day) => day.date === todayKey)?.date ??
          nextPlan.days[0]?.date ??
          nextPlan.from,
      );
    });
  }

  function shiftWeek(delta: number) {
    const start = parseDateKey(range.from);
    start.setDate(start.getDate() + delta * 7);
    loadWeekFrom(start);
  }

  function openCreate(date = activeDate) {
    setEditor({ mode: "create", date });
  }

  function openEdit(event: MealEvent) {
    setEditor({ mode: "edit", event, date: event.date });
  }

  async function refreshCurrentRange(preferredActiveDate = activeDate) {
    const result = await getMealPlanRangeAction(range.from, range.to);

    if (result.error || !result.mealPlan) {
      setError(result.error ?? "Unable to refresh this meal plan.");
      return;
    }

    const nextPlan = isMealPlanRange(result.mealPlan)
      ? result.mealPlan
      : buildEmptyRange(range.from, range.to);
    setRange(nextPlan);
    setActiveDate(
      nextPlan.days.some((day) => day.date === preferredActiveDate)
        ? preferredActiveDate
        : (nextPlan.days[0]?.date ?? nextPlan.from),
    );
    setError(null);
  }

  function toggleCartEvent(eventId: string) {
    setSelectedEventIds((current) =>
      current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId],
    );
    setCartError(null);
  }

  function generateCart() {
    const validIds = recipeEvents
      .map((event) => event.id)
      .filter((id) => selectedEventIds.includes(id));

    if (validIds.length === 0) {
      setCartError("Choose at least one recipe-backed meal.");
      return;
    }

    startGeneratingCart(async () => {
      setCartError(null);
      const result = await generateMealPlanCartAction({
        from: range.from,
        to: range.to,
        event_ids: validIds,
        retailer: "kroger",
        mode: "replace_active",
      });

      if (result.error) {
        setCartError(result.error);
        return;
      }

      router.push(result.cartId ? `/carts/${result.cartId}` : "/carts");
    });
  }

  async function deleteEvent(event: MealEvent) {
    if (event.locked) return;

    const rollback = range;
    setRange((current) => rangeWithoutEvent(current, event.id));
    const result = await deleteMealEventAction(event.id);
    if (result.error) {
      setRange(rollback);
      setError(result.error);
      return;
    }

    void refreshCurrentRange(activeDate);
  }

  async function setEventStatus(event: MealEvent, status: MealPlanEventStatus) {
    if (event.locked || status === event.status) return;

    const rollback = range;
    const nextEvent = { ...event, status };
    const updateDate = /^\d{4}-\d{2}-\d{2}$/.test(event.date)
      ? event.date
      : activeDate;
    setRange((current) => rangeWithEvent(current, nextEvent));
    const result = await updateMealEventAction(event.id, {
      date: updateDate,
      meal_label: event.meal_label,
      custom_label: event.custom_label ?? null,
      source_type: event.source_type,
      recipe_id: event.recipe_id ?? null,
      title: event.title,
      servings: event.servings ?? null,
      notes: event.notes ?? null,
      status,
    });
    if (result.error || !result.event) {
      setRange(rollback);
      setError(result.error ?? "Unable to update that meal.");
      return;
    }
    setRange((current) =>
      rangeWithEvent(current, {
        ...event,
        ...result.event,
        source_type: event.source_type,
        recipe_id: event.recipe_id,
        recipe: result.event?.recipe ?? event.recipe,
        meal_label: result.event?.meal_label ?? event.meal_label,
        title: result.event?.title || event.title,
        servings: result.event?.servings ?? event.servings,
        status: result.event?.status ?? status,
      }),
    );
    void refreshCurrentRange(event.date);
  }

  const selectedCount = selectedEventIds.filter((id) =>
    recipeEvents.some((event) => event.id === id),
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-24">
      {error ? (
        <div className="rounded-2xl border border-[#d37c6b]/25 bg-[#fbe6e1] px-4 py-3 text-body-sm text-[#8f3a2f]">
          {error}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-outline-variant/25 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-label-sm font-bold uppercase tracking-[0.18em] text-primary">
          Meal plan
        </p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-display-sm font-black leading-tight text-on-surface">
              Plan your week
            </h1>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Flexible meals, prep blocks, leftovers, and eat-out plans.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/35 bg-white text-on-surface-variant"
              aria-label="Previous week"
            >
              <span className="material-symbols-outlined text-[20px]">
                chevron_left
              </span>
            </button>
            <button
              type="button"
              onClick={() => loadWeekFrom(new Date())}
              className="rounded-full border border-outline-variant/35 bg-white px-4 py-2 text-label-md font-semibold text-on-surface-variant"
            >
              This week
            </button>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/35 bg-white text-on-surface-variant"
              aria-label="Next week"
            >
              <span className="material-symbols-outlined text-[20px]">
                chevron_right
              </span>
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-container-low px-3 py-2 text-label-md font-semibold text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">
              calendar_month
            </span>
            {formatRangeLabel(range.from, range.to)}
            {isLoadingRange ? (
              <span className="text-outline">Loading...</span>
            ) : null}
          </div>
          <div className="grid w-full grid-cols-3 rounded-full bg-[#fff3e4] p-1 sm:w-auto">
            {(["day", "week", "month"] as PlanView[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`rounded-full px-4 py-2 text-label-md font-bold capitalize transition ${
                  view === item
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-[#2f656b]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Calories"
          value={String(Math.round(range.nutrition_summary?.calories ?? 0))}
          helper={`${nutritionTargets.calories} weekly goal`}
        />
        <SummaryCard
          label="Protein"
          value={`${Math.round(range.nutrition_summary?.protein_g ?? 0)}g`}
          helper={`${nutritionTargets.protein_g}g weekly goal`}
        />
        <SummaryCard
          label="Carbs"
          value={`${Math.round(range.nutrition_summary?.carbs_g ?? 0)}g`}
          helper={`${nutritionTargets.carbs_g}g weekly goal`}
        />
        <SummaryCard
          label="Fat"
          value={`${Math.round(range.nutrition_summary?.fat_g ?? 0)}g`}
          helper={`${nutritionTargets.fat_g}g weekly goal`}
        />
      </section>

      {view === "day" ? (
        <DayPlanner
          days={range.days}
          activeDate={activeDate}
          todayKey={todayKey}
          onSelectDate={setActiveDate}
          onCreate={openCreate}
          onEdit={openEdit}
          onDelete={deleteEvent}
          onStatus={setEventStatus}
          recipeById={recipeById}
          selectedEventIds={selectedEventIds}
          onToggleCartEvent={toggleCartEvent}
        />
      ) : null}

      {view === "week" ? (
        <WeekPlanner
          days={range.days}
          todayKey={todayKey}
          onCreate={openCreate}
          onEdit={openEdit}
          onDelete={deleteEvent}
          onStatus={setEventStatus}
          recipeById={recipeById}
          selectedEventIds={selectedEventIds}
          onToggleCartEvent={toggleCartEvent}
        />
      ) : null}

      {view === "month" ? (
        <MonthOverview
          range={range}
          activeDate={activeDate}
          onSelectDate={(date) => {
            setActiveDate(date);
            setView("day");
          }}
        />
      ) : null}

      {cartError ? (
        <div className="rounded-2xl border border-[#d37c6b]/25 bg-[#fbe6e1] px-4 py-3 text-body-sm text-[#8f3a2f]">
          {cartError}
        </div>
      ) : null}

      <div className="fixed bottom-[72px] left-0 right-0 z-20 px-5 sm:bottom-6">
        <div className="mx-auto flex max-w-xl items-center gap-2 rounded-[24px] border border-outline-variant/25 bg-white/95 p-2 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={generateCart}
            disabled={isGeneratingCart || recipeEvents.length === 0}
            className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-[20px] bg-primary px-4 text-label-lg font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[21px]">
              shopping_cart
            </span>
            {isGeneratingCart
              ? "Creating cart..."
              : `Create cart (${selectedCount})`}
          </button>
          <button
            type="button"
            onClick={() =>
              setSelectedEventIds(
                selectedCount === recipeEvents.length
                  ? []
                  : recipeEvents.map((event) => event.id),
              )
            }
            className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-outline-variant/35 text-[#2f656b]"
            aria-label="Toggle recipe events"
          >
            <span className="material-symbols-outlined text-[22px]">
              checklist
            </span>
          </button>
        </div>
      </div>

      {editor ? (
        <MealEventEditor
          editor={editor}
          recipes={recipes}
          onClose={() => setEditor(null)}
          onSaved={(event) => {
            setRange((current) => rangeWithEvent(current, event));
            setActiveDate(event.date);
            setEditor(null);
            setError(null);
            void refreshCurrentRange(event.date);
          }}
          onError={setError}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/25 bg-white p-4 shadow-sm">
      <p className="text-label-sm font-bold uppercase tracking-[0.14em] text-primary">
        {label}
      </p>
      <p className="mt-1 text-title-lg font-black text-on-surface">{value}</p>
      <p className="mt-0.5 text-body-sm text-on-surface-variant">{helper}</p>
    </div>
  );
}

function DayPlanner({
  days,
  activeDate,
  todayKey,
  onSelectDate,
  onCreate,
  onEdit,
  onDelete,
  onStatus,
  recipeById,
  selectedEventIds,
  onToggleCartEvent,
}: {
  days: MealPlanRange["days"];
  activeDate: string;
  todayKey: string;
  onSelectDate: (date: string) => void;
  onCreate: (date: string) => void;
  onEdit: (event: MealEvent) => void;
  onDelete: (event: MealEvent) => void;
  onStatus: (event: MealEvent, status: MealPlanEventStatus) => void;
  recipeById: Map<string, BaseRecipe>;
  selectedEventIds: string[];
  onToggleCartEvent: (eventId: string) => void;
}) {
  const activeDay = days.find((day) => day.date === activeDate) ?? days[0];

  return (
    <section className="rounded-[28px] border border-outline-variant/25 bg-white p-4 shadow-sm sm:p-5">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {days.map((day, index) => {
          const date = parseDateKey(day.date);
          const active = day.date === activeDay?.date;
          const isToday = day.date === todayKey;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDate(day.date)}
              className={`flex min-w-16 flex-col items-center rounded-2xl border px-3 py-2 transition ${
                active
                  ? "border-primary bg-primary text-on-primary"
                  : isToday
                    ? "border-primary/30 bg-primary-surface text-primary"
                    : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {WEEKDAY_LABELS[index] ?? ""}
              </span>
              <span className="mt-0.5 text-title-md font-black">
                {date.getDate()}
              </span>
              <span className="text-[10px] font-semibold">
                {day.events.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-label-sm font-bold uppercase tracking-[0.14em] text-primary">
            {activeDay ? formatDateLabel(activeDay.date) : "Day"}
          </p>
          <h2 className="text-headline-sm font-black text-on-surface">
            {activeDay?.events.length
              ? `${activeDay.events.length} planned`
              : "Nothing planned yet"}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onCreate(activeDay?.date ?? activeDate)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm"
          aria-label="Add meal event"
        >
          <span className="material-symbols-outlined text-[24px]">add</span>
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {activeDay?.events.length ? (
          activeDay.events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              recipe={
                event.recipe_id ? recipeById.get(event.recipe_id) : undefined
              }
              selectedForCart={selectedEventIds.includes(event.id)}
              onToggleCart={() => onToggleCartEvent(event.id)}
              onEdit={() => onEdit(event)}
              onDelete={() => onDelete(event)}
              onStatus={(status) => onStatus(event, status)}
            />
          ))
        ) : (
          <button
            type="button"
            onClick={() => onCreate(activeDay?.date ?? activeDate)}
            className="flex min-h-32 w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-outline-variant/35 bg-surface-container-low/40 text-center text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[28px] text-primary">
              add_circle
            </span>
            <span className="mt-1 text-label-lg font-bold">Add a meal</span>
            <span className="text-body-sm">
              Recipe, manual meal, prep, leftover, or eat out.
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

function WeekPlanner(props: {
  days: MealPlanRange["days"];
  todayKey: string;
  onCreate: (date: string) => void;
  onEdit: (event: MealEvent) => void;
  onDelete: (event: MealEvent) => void;
  onStatus: (event: MealEvent, status: MealPlanEventStatus) => void;
  recipeById: Map<string, BaseRecipe>;
  selectedEventIds: string[];
  onToggleCartEvent: (eventId: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-outline-variant/25 bg-white shadow-sm">
      <div className="grid gap-0 md:grid-cols-7">
        {props.days.map((day, index) => (
          <div
            key={day.date}
            className="border-b border-outline-variant/15 p-3 last:border-b-0 md:min-h-[420px] md:border-b-0 md:border-r md:last:border-r-0"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p
                  className={`text-label-sm font-black uppercase tracking-[0.14em] ${
                    day.date === props.todayKey
                      ? "text-primary"
                      : "text-outline"
                  }`}
                >
                  {WEEKDAY_LABELS[index]}
                </p>
                <p className="text-title-md font-black text-on-surface">
                  {formatDateLabel(day.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => props.onCreate(day.date)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-surface text-primary"
                aria-label={`Add meal on ${day.date}`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  add
                </span>
              </button>
            </div>

            <div className="space-y-2">
              {day.events.length ? (
                day.events.map((event) => (
                  <CompactEventCard
                    key={event.id}
                    event={event}
                    recipe={
                      event.recipe_id
                        ? props.recipeById.get(event.recipe_id)
                        : undefined
                    }
                    selectedForCart={props.selectedEventIds.includes(event.id)}
                    onToggleCart={() => props.onToggleCartEvent(event.id)}
                    onEdit={() => props.onEdit(event)}
                    onDelete={() => props.onDelete(event)}
                    onStatus={(status) => props.onStatus(event, status)}
                  />
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => props.onCreate(day.date)}
                  className="w-full rounded-2xl border border-dashed border-outline-variant/35 px-3 py-4 text-label-md font-semibold text-outline"
                >
                  Add event
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MonthOverview({
  range,
  activeDate,
  onSelectDate,
}: {
  range: MealPlanRange;
  activeDate: string;
  onSelectDate: (date: string) => void;
}) {
  const anchor = parseDateKey(activeDate || range.from);
  const days = monthDays(anchor);
  const eventsByDate = new Map(range.days.map((day) => [day.date, day.events]));

  return (
    <section className="rounded-[28px] border border-outline-variant/25 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <p className="text-label-sm font-bold uppercase tracking-[0.14em] text-primary">
          Month overview
        </p>
        <h2 className="text-headline-sm font-black text-on-surface">
          {anchor.toLocaleString("en-US", { month: "long" })}{" "}
          {anchor.getFullYear()}
        </h2>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((day) => (
          <p
            key={day}
            className="pb-1 text-[10px] font-black uppercase tracking-widest text-outline"
          >
            {day.slice(0, 1)}
          </p>
        ))}
        {days.map((date) => {
          const dateKey = toDateKey(date);
          const events = eventsByDate.get(dateKey) ?? [];
          const inMonth = date.getMonth() === anchor.getMonth();
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={`min-h-16 rounded-2xl border p-1 text-left transition ${
                dateKey === activeDate
                  ? "border-primary bg-primary-surface"
                  : "border-outline-variant/20 bg-surface-container-low/40"
              } ${inMonth ? "opacity-100" : "opacity-40"}`}
            >
              <span className="text-label-sm font-black text-on-surface">
                {date.getDate()}
              </span>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {events.slice(0, 3).map((event) => (
                  <span
                    key={event.id}
                    className="h-1.5 w-4 rounded-full bg-primary"
                    title={event.title}
                  />
                ))}
                {events.length > 3 ? (
                  <span className="text-[9px] font-bold text-primary">
                    +{events.length - 3}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EventCard(props: {
  event: MealEvent;
  recipe?: BaseRecipe;
  selectedForCart: boolean;
  onToggleCart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: MealPlanEventStatus) => void;
}) {
  const { event, recipe } = props;
  const imageSrc = recipe?.cover_image_url ?? event.recipe?.cover_image_url;

  return (
    <article className="rounded-[24px] border border-outline-variant/25 bg-surface-container-low/45 p-3">
      <div className="flex gap-3">
        {event.source_type === "recipe" ? (
          <RecipeImage
            src={imageSrc}
            alt={event.title}
            seed={event.recipe_id ?? event.id}
            className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl"
            imgClassName="h-20 w-20 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-primary">
            <span className="material-symbols-outlined text-[28px]">
              {sourceIcon(event.source_type)}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-primary-surface px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-primary">
              {event.custom_label || labelText(event.meal_label)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${statusClasses(event.status)}`}
            >
              {statusText(event.status)}
            </span>
          </div>
          <h3 className="mt-1 line-clamp-2 text-title-md font-black text-on-surface">
            {event.title}
          </h3>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            {sourceText(event.source_type)}
            {event.servings
              ? ` · ${event.servings} serving${event.servings === 1 ? "" : "s"}`
              : ""}
          </p>
          {event.notes ? (
            <p className="mt-1 line-clamp-2 text-body-sm text-on-surface-variant">
              {event.notes}
            </p>
          ) : null}
        </div>
      </div>

      <EventActions {...props} />
    </article>
  );
}

function CompactEventCard(props: {
  event: MealEvent;
  recipe?: BaseRecipe;
  selectedForCart: boolean;
  onToggleCart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: MealPlanEventStatus) => void;
}) {
  const { event } = props;
  return (
    <article className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/45 p-2">
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined mt-0.5 text-[18px] text-primary">
          {sourceIcon(event.source_type)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-body-sm font-bold text-on-surface">
            {event.title}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-outline">
            {event.custom_label || labelText(event.meal_label)}
          </p>
        </div>
      </div>
      <EventActions compact {...props} />
    </article>
  );
}

function EventActions({
  event,
  selectedForCart,
  onToggleCart,
  onEdit,
  onDelete,
  onStatus,
  compact = false,
}: {
  event: MealEvent;
  selectedForCart: boolean;
  onToggleCart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: MealPlanEventStatus) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`mt-3 flex items-center gap-2 ${compact ? "flex-wrap" : ""}`}
    >
      {event.source_type === "recipe" ? (
        <button
          type="button"
          onClick={onToggleCart}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-sm font-bold ${
            selectedForCart
              ? "bg-primary text-on-primary"
              : "bg-white text-on-surface-variant"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">
            {selectedForCart ? "check_box" : "check_box_outline_blank"}
          </span>
          Cart
        </button>
      ) : null}

      <select
        value={event.status}
        onChange={(changeEvent) =>
          onStatus(changeEvent.target.value as MealPlanEventStatus)
        }
        disabled={event.locked}
        className="min-w-0 rounded-full border border-outline-variant/30 bg-white px-3 py-1.5 text-label-sm font-semibold text-on-surface-variant"
      >
        {STATUSES.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onEdit}
        disabled={event.locked}
        className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/35 bg-white text-[#2f656b] disabled:opacity-40"
        aria-label="Edit meal event"
      >
        <span className="material-symbols-outlined text-[18px]">edit</span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={event.locked}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#f1b1a7] bg-white text-[#b3261e] disabled:opacity-40"
        aria-label="Delete meal event"
      >
        <span className="material-symbols-outlined text-[18px]">delete</span>
      </button>
    </div>
  );
}

function MealEventEditor({
  editor,
  recipes,
  onClose,
  onSaved,
  onError,
}: {
  editor: EditorState;
  recipes: BaseRecipe[];
  onClose: () => void;
  onSaved: (event: MealEvent) => void;
  onError: (message: string) => void;
}) {
  const event = editor.event;
  const fallbackDate = /^\d{4}-\d{2}-\d{2}$/.test(editor.date)
    ? editor.date
    : toDateKey(new Date());
  const [date, setDate] = useState(event?.date ?? fallbackDate);
  const [sourceType, setSourceType] = useState<MealPlanSourceType>(
    event?.source_type ?? "recipe",
  );
  const [mealLabel, setMealLabel] = useState<MealPlanMealLabel>(
    event?.meal_label ?? "dinner",
  );
  const [customLabel, setCustomLabel] = useState(event?.custom_label ?? "");
  const [recipeId, setRecipeId] = useState(event?.recipe_id ?? "");
  const initialRecipe = event?.recipe_id
    ? recipes.find((recipe) => recipe.id === event.recipe_id)
    : undefined;
  const [title, setTitle] = useState(
    event?.title ?? recipeTitle(initialRecipe),
  );
  const [servings, setServings] = useState(String(event?.servings ?? 1));
  const [notes, setNotes] = useState(event?.notes ?? "");
  const [status, setStatus] = useState<MealPlanEventStatus>(
    event?.status ?? "planned",
  );
  const [search, setSearch] = useState("");
  const [isSaving, startSaving] = useTransition();

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(search.toLowerCase()),
  );

  function chooseRecipe(nextRecipeId: string) {
    setRecipeId(nextRecipeId);
    const recipe = recipes.find((item) => item.id === nextRecipeId);
    if (recipe) {
      setTitle(recipe.name);
      setServings(String(recipe.servings || 1));
    }
  }

  function submit() {
    const normalizedTitle = title.trim();
    const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : fallbackDate;
    if (!normalizedTitle) {
      onError("Add a title for this meal.");
      return;
    }

    const servingCount = Number(servings);
    const input: CreateMealEventRequest = {
      date: normalizedDate,
      meal_label: mealLabel,
      custom_label: mealLabel === "custom" ? customLabel.trim() || null : null,
      source_type: sourceType,
      recipe_id: sourceType === "recipe" ? recipeId : "",
      title: normalizedTitle,
      servings: Number.isFinite(servingCount) ? servingCount : 1,
      notes: notes.trim() || null,
      status,
    };

    if (sourceType === "recipe" && !recipeId) {
      onError("Choose a recipe for this meal.");
      return;
    }

    startSaving(async () => {
      const result =
        editor.mode === "edit" && event
          ? await updateMealEventAction(event.id, input)
          : await createMealEventAction(input);

      if (result.error || !result.event) {
        onError(result.error ?? "Unable to save that meal.");
        return;
      }

      onSaved(result.event);
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/45 sm:items-center sm:justify-center">
      <div className="max-h-[86vh] w-full overflow-y-auto rounded-t-[32px] bg-white p-5 shadow-2xl sm:max-h-[92vh] sm:max-w-2xl sm:rounded-[32px] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label-sm font-bold uppercase tracking-[0.18em] text-primary">
              Meal event
            </p>
            <h2 className="text-headline-sm font-black text-on-surface">
              {editor.mode === "edit" ? "Edit meal" : "Add meal"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant/35 text-on-surface-variant"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-label-sm font-bold uppercase tracking-[0.08em] text-[#5d7d82]">
              Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(changeEvent) => setDate(changeEvent.target.value)}
              className="w-full rounded-2xl border border-outline-variant/40 px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-label-sm font-bold uppercase tracking-[0.08em] text-[#5d7d82]">
              Label
            </span>
            <select
              value={mealLabel}
              onChange={(changeEvent) =>
                setMealLabel(changeEvent.target.value as MealPlanMealLabel)
              }
              className="w-full rounded-2xl border border-outline-variant/40 px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/25"
            >
              {MEAL_LABELS.map((label) => (
                <option key={label.value} value={label.value}>
                  {label.label}
                </option>
              ))}
            </select>
          </label>

          {mealLabel === "custom" ? (
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-label-sm font-bold uppercase tracking-[0.08em] text-[#5d7d82]">
                Custom label
              </span>
              <input
                value={customLabel}
                onChange={(changeEvent) =>
                  setCustomLabel(changeEvent.target.value)
                }
                placeholder="Post-workout, brunch, movie night..."
                className="w-full rounded-2xl border border-outline-variant/40 px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {SOURCE_TYPES.map((source) => (
            <button
              key={source.value}
              type="button"
              onClick={() => {
                setSourceType(source.value);
                if (source.value !== "recipe") setRecipeId("");
              }}
              className={`rounded-2xl border px-3 py-2 text-label-md font-bold transition ${
                sourceType === source.value
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant/35 bg-white text-on-surface-variant"
              }`}
            >
              {source.label}
            </button>
          ))}
        </div>

        {sourceType === "recipe" ? (
          <div className="mt-4 rounded-[24px] border border-outline-variant/25 bg-surface-container-low/40 p-3">
            <input
              value={search}
              onChange={(changeEvent) => setSearch(changeEvent.target.value)}
              placeholder="Search recipes"
              className="w-full rounded-2xl border border-outline-variant/40 bg-white px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/25"
            />
            <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
              {filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => chooseRecipe(recipe.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-2 text-left transition ${
                    recipeId === recipe.id
                      ? "border-primary bg-primary-surface"
                      : "border-outline-variant/20 bg-white"
                  }`}
                >
                  <RecipeImage
                    src={recipe.cover_image_url}
                    alt={recipe.name}
                    seed={recipe.id}
                    className="h-12 w-12 shrink-0 overflow-hidden rounded-xl"
                    imgClassName="h-12 w-12 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-body-md font-bold text-on-surface">
                      {recipe.name}
                    </p>
                    <p className="text-label-sm text-on-surface-variant">
                      {recipe.servings} serving
                      {recipe.servings === 1 ? "" : "s"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-label-sm font-bold uppercase tracking-[0.08em] text-[#5d7d82]">
              Title
            </span>
            <input
              value={title}
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              placeholder="Protein smoothie"
              className="w-full rounded-2xl border border-outline-variant/40 px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-label-sm font-bold uppercase tracking-[0.08em] text-[#5d7d82]">
              Servings
            </span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={servings}
              onChange={(changeEvent) => setServings(changeEvent.target.value)}
              className="w-full rounded-2xl border border-outline-variant/40 px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-label-sm font-bold uppercase tracking-[0.08em] text-[#5d7d82]">
              Status
            </span>
            <select
              value={status}
              onChange={(changeEvent) =>
                setStatus(changeEvent.target.value as MealPlanEventStatus)
              }
              className="w-full rounded-2xl border border-outline-variant/40 px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/25"
            >
              {STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-label-sm font-bold uppercase tracking-[0.08em] text-[#5d7d82]">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(changeEvent) => setNotes(changeEvent.target.value)}
              rows={3}
              placeholder="Use almond milk, prep ahead, restaurant name..."
              className="w-full resize-none rounded-2xl border border-outline-variant/40 px-4 py-3 text-body-md outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-outline-variant/35 px-4 py-3 text-label-lg font-bold text-on-surface-variant"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isSaving}
            className="rounded-full bg-primary px-4 py-3 text-label-lg font-bold text-on-primary disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
