"use client";

import { useEffect, useRef, useState } from "react";
import type { BaseRecipe, MealPlan, MealPlanDay } from "@cart/shared";
import { getMealPlanAction, saveMealPlanAction } from "@/app/meal-plan/actions";
import { RecipeImage } from "@/components/ui/recipe-image";

type MealType = "breakfast" | "lunch" | "dinner";
type WeekPlan = MealPlanDay[];

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const MEAL_CONFIG: { type: MealType; label: string; icon: string }[] = [
  { type: "breakfast", label: "Breakfast", icon: "wb_sunny" },
  { type: "lunch", label: "Lunch", icon: "restaurant" },
  { type: "dinner", label: "Dinner", icon: "dinner_dining" },
];

const WEEKLY_TARGETS = {
  protein_g: 350,
  carbs_g: 1750,
  fiber_g: 175,
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonday(date: Date): Date {
  const nextDate = new Date(date);
  const day = nextDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  nextDate.setDate(nextDate.getDate() + diff);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function buildEmptyPlan(): WeekPlan {
  return Array.from({ length: 7 }, () => ({}));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function WeeklyMealPlan({
  recipes,
  initialMealPlan,
}: {
  recipes: BaseRecipe[];
  initialMealPlan: MealPlan;
}) {
  const today = new Date();
  const initialWeekStart = initialMealPlan.week_start || toDateKey(getMonday(today));
  const initialPlan =
    initialMealPlan.days?.length === 7 ? initialMealPlan.days : buildEmptyPlan();

  const [weekStart, setWeekStart] = useState<Date>(() => {
    const parsed = new Date(`${initialWeekStart}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? getMonday(today) : parsed;
  });
  const [plan, setPlan] = useState<WeekPlan>(initialPlan);
  const [pickerSlot, setPickerSlot] = useState<{ dayIndex: number; meal: MealType } | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [showFullGroceryList, setShowFullGroceryList] = useState(false);
  const [checkedGroceriesByWeek, setCheckedGroceriesByWeek] = useState<
    Record<string, string[]>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);

  const currentWeekKeyRef = useRef(initialWeekStart);
  const loadRequestRef = useRef(0);
  const saveQueueRef = useRef(Promise.resolve());
  const cachedPlansRef = useRef(new Map<string, WeekPlan>([[initialWeekStart, initialPlan]]));

  useEffect(() => {
    setPickerSlot(null);
    setPickerSearch("");
  }, [weekStart]);

  useEffect(() => {
    const weekKey = toDateKey(weekStart);
    currentWeekKeyRef.current = weekKey;

    const cachedPlan = cachedPlansRef.current.get(weekKey);
    if (cachedPlan) {
      setPlan(cachedPlan);
      setError(null);
      setIsLoadingWeek(false);
      return;
    }

    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setIsLoadingWeek(true);
    setError(null);

    void getMealPlanAction(weekKey).then((result) => {
      if (loadRequestRef.current !== requestId) {
        return;
      }

      if (result.error) {
        setError(result.error);
        setPlan(buildEmptyPlan());
      } else {
        const nextPlan =
          result.mealPlan?.days?.length === 7
            ? result.mealPlan.days
            : buildEmptyPlan();
        cachedPlansRef.current.set(weekKey, nextPlan);
        setPlan(nextPlan);
        setError(null);
      }

      setIsLoadingWeek(false);
    });
  }, [weekStart]);

  useEffect(() => {
    if (!pickerSlot) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPickerSlot(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pickerSlot]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowFullGroceryList(false);
      }
    }

    if (showFullGroceryList) {
      document.addEventListener("keydown", onKeyDown);
    }

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showFullGroceryList]);

  function queueSave(nextPlan: WeekPlan, rollbackPlan: WeekPlan, weekKey: string) {
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      const result = await saveMealPlanAction(weekKey, nextPlan);

      if (result.error) {
        cachedPlansRef.current.set(weekKey, rollbackPlan);
        if (currentWeekKeyRef.current === weekKey) {
          setPlan(rollbackPlan);
          setError(result.error);
        }
        return;
      }

      if (result.mealPlan?.days?.length === 7) {
        cachedPlansRef.current.set(weekKey, result.mealPlan.days);
        if (currentWeekKeyRef.current === weekKey) {
          setPlan(result.mealPlan.days);
          setError(null);
        }
      }
    });
  }

  function setMeal(dayIndex: number, meal: MealType, recipeId: string | undefined) {
    const weekKey = toDateKey(weekStart);
    const rollbackPlan = plan;
    const updated = plan.map((day, index) =>
      index === dayIndex ? { ...day, [meal]: recipeId } : day,
    ) as WeekPlan;

    cachedPlansRef.current.set(weekKey, updated);
    setPlan(updated);
    setPickerSlot(null);
    setPickerSearch("");
    setError(null);
    queueSave(updated, rollbackPlan, weekKey);
  }

  function getRecipe(id?: string) {
    if (!id) {
      return undefined;
    }

    return recipes.find((recipe) => recipe.id === id);
  }

  function shiftWeek(delta: number) {
    setWeekStart((previous) => {
      const nextDate = new Date(previous);
      nextDate.setDate(nextDate.getDate() + delta * 7);
      return nextDate;
    });
  }

  const weekKey = toDateKey(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} - ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

  const allRecipeIds = plan.flatMap((day) =>
    [day.breakfast, day.lunch, day.dinner].filter(Boolean) as string[],
  );

  const nutrition = allRecipeIds.reduce(
    (accumulator, id) => {
      const recipe = getRecipe(id);
      if (!recipe?.nutrition_data) {
        return accumulator;
      }

      return {
        protein_g: accumulator.protein_g + (recipe.nutrition_data.protein_g ?? 0),
        carbs_g: accumulator.carbs_g + (recipe.nutrition_data.carbs_g ?? 0),
        fiber_g: accumulator.fiber_g + (recipe.nutrition_data.fiber_g ?? 0),
      };
    },
    { protein_g: 0, carbs_g: 0, fiber_g: 0 },
  );

  const groceryMap = new Map<string, { amount: number; unit: string }>();
  for (const id of allRecipeIds) {
    const recipe = getRecipe(id);
    for (const ingredient of recipe?.ingredients ?? []) {
      const key = ingredient.canonical_ingredient;
      const existing = groceryMap.get(key);
      if (existing && existing.unit === ingredient.unit) {
        groceryMap.set(key, {
          amount: existing.amount + ingredient.amount,
          unit: ingredient.unit,
        });
      } else if (!existing) {
        groceryMap.set(key, { amount: ingredient.amount, unit: ingredient.unit });
      }
    }
  }
  const groceryList = Array.from(groceryMap.entries());
  const checkedGroceries = new Set(checkedGroceriesByWeek[weekKey] ?? []);

  const usedIds = new Set(allRecipeIds);
  const seasonalPick = recipes.find((recipe) => !usedIds.has(recipe.id)) ?? null;
  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(pickerSearch.toLowerCase()),
  );

  function groceryItemKey(name: string, amount: number, unit: string) {
    return `${name}::${amount}::${unit}`;
  }

  function toggleGroceryItem(name: string, amount: number, unit: string) {
    const itemKey = groceryItemKey(name, amount, unit);
    setCheckedGroceriesByWeek((current) => {
      const nextWeekItems = new Set(current[weekKey] ?? []);
      if (nextWeekItems.has(itemKey)) {
        nextWeekItems.delete(itemKey);
      } else {
        nextWeekItems.add(itemKey);
      }

      return {
        ...current,
        [weekKey]: Array.from(nextWeekItems),
      };
    });
  }

  return (
    <div
      className="space-y-6"
      onClick={() => {
        setPickerSlot(null);
      }}
    >
      {error ? (
        <div className="rounded-2xl border border-[#d37c6b]/25 bg-[#fbe6e1] px-4 py-3 text-body-sm text-[#8f3a2f]">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-headline-sm font-bold text-on-surface">Weekly Meal Plan</h2>
          <div className="flex items-center gap-1.5 bg-surface-container-low rounded-full px-3 py-1.5 text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">calendar_month</span>
            {weekLabel}
          </div>
          {isLoadingWeek ? (
            <span className="text-label-sm text-outline">Loading week...</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              shiftWeek(-1);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              setWeekStart(getMonday(new Date()));
            }}
            className="px-3 py-1.5 rounded-full border border-outline-variant/30 text-label-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Today
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              shiftWeek(1);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-outline-variant/25 bg-white shadow-sm overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-outline-variant/20 bg-surface-container-low/40">
            <div />
            {DAY_LABELS.map((day, index) => {
              const date = new Date(weekStart);
              date.setDate(date.getDate() + index);
              const isToday = date.toDateString() === today.toDateString();

              return (
                <div key={day} className="py-3 text-center">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? "text-primary" : "text-outline"}`}>
                    {day}
                  </p>
                  <p className={`text-body-lg font-bold mt-0.5 ${isToday ? "text-primary" : "text-on-surface"}`}>
                    {date.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {MEAL_CONFIG.map((meal, mealIndex) => (
            <div
              key={meal.type}
              className={`grid grid-cols-[80px_repeat(7,1fr)] ${mealIndex < MEAL_CONFIG.length - 1 ? "border-b border-outline-variant/15" : ""}`}
            >
              <div className="flex flex-col items-center justify-center py-4 gap-1 bg-surface-container-low/20 border-r border-outline-variant/15">
                <span className="material-symbols-outlined text-[20px] text-primary">{meal.icon}</span>
                <p className="text-[11px] font-medium text-outline">{meal.label}</p>
              </div>

              {Array.from({ length: 7 }, (_, dayIndex) => {
                const recipeId = plan[dayIndex]?.[meal.type];
                const recipe = getRecipe(recipeId);
                const isOpen = pickerSlot?.dayIndex === dayIndex && pickerSlot.meal === meal.type;

                return (
                  <div
                    key={dayIndex}
                    className="relative border-r border-outline-variant/10 last:border-r-0 p-1.5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {recipe ? (
                      <div className="group relative w-full rounded-2xl overflow-hidden bg-surface-container-low hover:ring-2 hover:ring-primary/40 transition-all">
                        <button
                          onClick={() => setPickerSlot(isOpen ? null : { dayIndex, meal: meal.type })}
                          className="block w-full text-left"
                        >
                          <RecipeImage
                            src={recipe.cover_image_url}
                            alt={recipe.name}
                            seed={recipe.id}
                            className="w-full h-16"
                            imgClassName="w-full h-16 object-cover"
                          />
                          <div className="px-1.5 py-1.5">
                            <p className="text-[10px] font-semibold text-on-surface leading-tight line-clamp-2">
                              {recipe.name}
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setMeal(dayIndex, meal.type, undefined);
                          }}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined text-[11px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPickerSlot(isOpen ? null : { dayIndex, meal: meal.type })}
                        className="w-full min-h-[80px] rounded-2xl border-2 border-dashed border-outline-variant/30 flex items-center justify-center text-outline-variant hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                      </button>
                    )}

                    {isOpen ? (
                      <div
                        className="absolute z-30 top-full left-0 mt-1 w-64 rounded-2xl border border-outline-variant/30 bg-white shadow-2xl p-3 space-y-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          autoFocus
                          value={pickerSearch}
                          onChange={(event) => setPickerSearch(event.target.value)}
                          placeholder="Search recipes..."
                          className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-1.5 text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />

                        <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
                          {filteredRecipes.length === 0 ? (
                            <p className="text-body-sm text-outline text-center py-4">No recipes found</p>
                          ) : (
                            filteredRecipes.map((filteredRecipe) => (
                              <button
                                key={filteredRecipe.id}
                                onClick={() => setMeal(dayIndex, meal.type, filteredRecipe.id)}
                                className="w-full flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface-container-low text-left transition-colors"
                              >
                                <RecipeImage
                                  src={filteredRecipe.cover_image_url}
                                  alt={filteredRecipe.name}
                                  seed={filteredRecipe.id}
                                  className="h-9 w-9 rounded-lg overflow-hidden shrink-0"
                                  imgClassName="h-9 w-9 object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="text-body-sm font-semibold text-on-surface truncate">
                                    {filteredRecipe.name}
                                  </p>
                                  <p className="text-[11px] text-outline">
                                    {filteredRecipe.servings} serving{filteredRecipe.servings !== 1 ? "s" : ""}
                                  </p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>

                        {recipe ? (
                          <button
                            onClick={() => setMeal(dayIndex, meal.type, undefined)}
                            className="w-full text-center text-label-sm text-error hover:text-error/80 pt-1.5 border-t border-outline-variant/20"
                          >
                            Remove meal
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-[24px] border border-outline-variant/25 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-body-lg font-bold text-on-surface">Grocery List</h3>
            {groceryList.length > 0 ? (
              <span className="rounded-full bg-secondary-container px-2.5 py-1 text-label-sm text-on-secondary-container">
                {groceryList.length} items
              </span>
            ) : null}
          </div>

          {groceryList.length === 0 ? (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-[36px] text-outline-variant">shopping_basket</span>
              <p className="mt-2 text-body-sm text-outline">Add meals to generate your grocery list.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                {groceryList.slice(0, 5).map(([name, { amount, unit }]) => (
                  <button
                    key={groceryItemKey(name, amount, unit)}
                    type="button"
                    onClick={() => toggleGroceryItem(name, amount, unit)}
                    className="flex w-full items-center gap-2.5 text-left"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        checkedGroceries.has(groceryItemKey(name, amount, unit))
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant/50 bg-white"
                      }`}
                    >
                      {checkedGroceries.has(groceryItemKey(name, amount, unit)) ? (
                        <span className="material-symbols-outlined text-[12px]">
                          check
                        </span>
                      ) : null}
                    </span>
                    <p
                      className={`text-body-sm capitalize ${
                        checkedGroceries.has(groceryItemKey(name, amount, unit))
                          ? "text-outline line-through"
                          : "text-on-surface"
                      }`}
                    >
                      {name}
                      {amount > 0 ? (
                        <span className="text-outline ml-1">
                          x{Math.ceil(amount)}
                          {unit ? ` ${unit}` : ""}
                        </span>
                      ) : null}
                    </p>
                  </button>
                ))}
              </div>

              {groceryList.length > 5 ? (
                <p className="mt-3 text-label-sm text-primary font-semibold">
                  +{groceryList.length - 5} more items
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => setShowFullGroceryList(true)}
                className="mt-4 w-full text-center text-label-md font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                View Full List
              </button>
            </>
          )}
        </div>

        <div className="rounded-[24px] border border-outline-variant/25 bg-white p-5 shadow-sm">
          <h3 className="text-body-lg font-bold text-on-surface mb-4">Weekly Nutrition</h3>
          {allRecipeIds.length === 0 ? (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-[36px] text-outline-variant">nutrition</span>
              <p className="mt-2 text-body-sm text-outline">Plan meals to see nutrition breakdown.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: "Protein", value: nutrition.protein_g, target: WEEKLY_TARGETS.protein_g, unit: "g", color: "bg-[#f59e0b]" },
                { label: "Carbs", value: nutrition.carbs_g, target: WEEKLY_TARGETS.carbs_g, unit: "g", color: "bg-[#3b82f6]" },
                { label: "Fiber", value: nutrition.fiber_g, target: WEEKLY_TARGETS.fiber_g, unit: "g", color: "bg-[#22c55e]" },
              ].map(({ label, value, target, unit, color }) => {
                const percent = Math.min(100, Math.round((value / target) * 100));

                return (
                  <div key={label}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-body-sm text-on-surface-variant">{label}</span>
                      <span className="text-label-sm font-bold text-on-surface">{percent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${color}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-outline">
                      {Math.round(value)}
                      {unit} of {target}
                      {unit} weekly goal
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {seasonalPick ? (
          <div className="rounded-[24px] bg-[#f59e0b] p-5 text-white relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: "radial-gradient(circle at 70% 20%, white 0%, transparent 55%)" }}
            />
            <span className="relative inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest mb-3">
              Suggested Pick
            </span>
            <p className="relative text-headline-sm font-bold leading-tight mb-2">{seasonalPick.name}</p>
            {seasonalPick.description ? (
              <p className="relative text-body-sm text-white/80 mb-3 line-clamp-2">
                {seasonalPick.description}
              </p>
            ) : null}
            <p className="relative text-body-sm text-white/70 mb-4">
              {seasonalPick.servings} serving{seasonalPick.servings !== 1 ? "s" : ""}
              {seasonalPick.nutrition_data?.calories
                ? ` - ${seasonalPick.nutrition_data.calories} kcal`
                : ""}
            </p>
            <button
              onClick={() => {
                for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
                  for (const meal of ["breakfast", "lunch", "dinner"] as MealType[]) {
                    if (!plan[dayIndex]?.[meal]) {
                      setMeal(dayIndex, meal, seasonalPick.id);
                      return;
                    }
                  }
                }
              }}
              className="relative rounded-full bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 text-label-md font-semibold"
            >
              Add to Plan
            </button>
          </div>
        ) : (
          <div className="rounded-[24px] border border-outline-variant/20 bg-surface-container-low p-5 flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-[40px] text-outline-variant">auto_awesome</span>
              <p className="mt-2 text-body-sm text-outline">All your recipes are in this week&apos;s plan!</p>
            </div>
          </div>
        )}
      </div>

      {showFullGroceryList ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6"
          onClick={() => setShowFullGroceryList(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/20 px-6 py-5">
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">
                  Full Grocery List
                </h3>
                <p className="mt-1 text-body-sm text-outline">
                  {groceryList.length} item{groceryList.length !== 1 ? "s" : ""} for{" "}
                  {weekLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFullGroceryList(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container-low hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="max-h-[calc(80vh-96px)] overflow-y-auto px-6 py-5">
              {groceryList.length === 0 ? (
                <div className="py-10 text-center">
                  <span className="material-symbols-outlined text-[36px] text-outline-variant">
                    shopping_basket
                  </span>
                  <p className="mt-2 text-body-sm text-outline">
                    Add meals to generate your grocery list.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groceryList.map(([name, { amount, unit }]) => (
                    <button
                      key={groceryItemKey(name, amount, unit)}
                      type="button"
                      onClick={() => toggleGroceryItem(name, amount, unit)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-outline-variant/20 bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-container-low"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          checkedGroceries.has(groceryItemKey(name, amount, unit))
                            ? "border-primary bg-primary text-on-primary"
                            : "border-outline-variant/50 bg-white"
                        }`}
                      >
                        {checkedGroceries.has(groceryItemKey(name, amount, unit)) ? (
                          <span className="material-symbols-outlined text-[14px]">
                            check
                          </span>
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-body-md capitalize ${
                            checkedGroceries.has(groceryItemKey(name, amount, unit))
                              ? "text-outline line-through"
                              : "text-on-surface"
                          }`}
                        >
                          {name}
                        </p>
                        <p className="mt-0.5 text-body-sm text-outline">
                          {amount > 0 ? `x${Math.ceil(amount)}` : ""}
                          {unit ? ` ${unit}` : ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
