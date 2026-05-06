import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChefColors, ChefRadius } from "@/constants/chef-theme";
import { loadMealPlanData } from "@/lib/api";
import type { BaseRecipe, MealPlan, MealPlanDay, MealPlanMealType } from "@/lib/types";

const mealTypes: Array<{ key: MealPlanMealType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "breakfast", label: "Breakfast", icon: "sunny-outline" },
  { key: "lunch", label: "Lunch", icon: "restaurant-outline" },
  { key: "dinner", label: "Dinner", icon: "wine-outline" },
];

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayKey(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

function addDays(key: string, days: number) {
  const date = new Date(`${key}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date;
}

function shortDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MealPlanScreen() {
  const [weekStart, setWeekStart] = useState(getMondayKey());
  const [recipes, setRecipes] = useState<BaseRecipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await loadMealPlanData(weekStart);
    setRecipes(result.recipes);
    setMealPlan(result.mealPlan);
    setError(result.error);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    void load();
  }, [weekStart]);

  const recipesById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe])),
    [recipes],
  );
  const plannedCount =
    mealPlan?.days.reduce(
      (count, day) => count + mealTypes.filter((meal) => Boolean(day[meal.key])).length,
      0,
    ) ?? 0;
  const weekEnd = addDays(weekStart, 6);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function moveWeek(offset: number) {
    setWeekStart(addDays(weekStart, offset * 7).toISOString().slice(0, 10));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Meal Plan</Text>
            <Text style={styles.subtitle}>
              {shortDate(addDays(weekStart, 0))} - {shortDate(weekEnd)}
            </Text>
          </View>
          {loading ? <ActivityIndicator color={ChefColors.primary} /> : null}
        </View>

        <View style={styles.weekControls}>
          <Pressable onPress={() => moveWeek(-1)} style={styles.roundButton}>
            <Ionicons color={ChefColors.ink} name="chevron-back" size={18} />
          </Pressable>
          <Pressable onPress={() => setWeekStart(getMondayKey())} style={styles.todayButton}>
            <Text style={styles.todayText}>Today</Text>
          </Pressable>
          <Pressable onPress={() => moveWeek(1)} style={styles.roundButton}>
            <Ionicons color={ChefColors.ink} name="chevron-forward" size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.notice}>{error}</Text> : null}

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryNumber}>{plannedCount}</Text>
            <Text style={styles.muted}>of 21 meal slots planned</Text>
          </View>
          <View style={styles.sparkle}>
            <Ionicons color={ChefColors.primary} name="sparkles-outline" size={24} />
          </View>
        </View>

        <View style={styles.days}>
          {(mealPlan?.days ?? Array.from({ length: 7 }, (): MealPlanDay => ({}))).map((day, dayIndex) => (
            <View key={`${weekStart}-${dayIndex}`} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{dayLabels[dayIndex]}</Text>
                <Text style={styles.dayDate}>{addDays(weekStart, dayIndex).getDate()}</Text>
              </View>

              <View style={styles.meals}>
                {mealTypes.map((meal) => {
                  const recipe = day[meal.key] ? recipesById.get(day[meal.key] ?? "") : null;
                  return (
                    <View key={meal.key} style={styles.mealRow}>
                      <View style={styles.mealType}>
                        <Ionicons color={ChefColors.primary} name={meal.icon} size={18} />
                        <Text style={styles.mealLabel}>{meal.label}</Text>
                      </View>
                      {recipe ? (
                        <View style={styles.plannedRecipe}>
                          {recipe.cover_image_url ? (
                            <Image
                              source={{ uri: recipe.cover_image_url }}
                              style={styles.recipeImage}
                              contentFit="cover"
                            />
                          ) : null}
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={2} style={styles.recipeName}>
                              {recipe.name}
                            </Text>
                            <Text style={styles.muted}>{recipe.servings} servings</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.emptySlot}>
                          <Ionicons color={ChefColors.muted} name="add" size={18} />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: ChefColors.background, flex: 1 },
  content: { gap: 18, padding: 20, paddingBottom: 120 },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  title: { color: ChefColors.ink, fontSize: 34, fontWeight: "900" },
  subtitle: { color: ChefColors.muted, fontSize: 15, marginTop: 4 },
  weekControls: { flexDirection: "row", gap: 10 },
  roundButton: {
    alignItems: "center",
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  todayButton: {
    alignItems: "center",
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  todayText: { color: ChefColors.ink, fontSize: 13, fontWeight: "900" },
  notice: {
    backgroundColor: ChefColors.primarySoft,
    borderRadius: ChefRadius.sm,
    color: ChefColors.primary,
    padding: 12,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: ChefColors.dark,
    borderRadius: ChefRadius.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
  },
  summaryNumber: { color: "#fff", fontSize: 34, fontWeight: "900" },
  sparkle: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  days: { gap: 14 },
  dayCard: {
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  dayHeader: {
    alignItems: "center",
    borderBottomColor: ChefColors.outline,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  dayLabel: { color: ChefColors.primary, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  dayDate: { color: ChefColors.ink, fontSize: 22, fontWeight: "900" },
  meals: { gap: 12, padding: 14 },
  mealRow: { gap: 8 },
  mealType: { alignItems: "center", flexDirection: "row", gap: 8 },
  mealLabel: { color: ChefColors.muted, fontSize: 13, fontWeight: "900" },
  plannedRecipe: {
    alignItems: "center",
    backgroundColor: ChefColors.surfaceMuted,
    borderRadius: ChefRadius.md,
    flexDirection: "row",
    gap: 12,
    padding: 10,
  },
  recipeImage: { borderRadius: ChefRadius.sm, height: 58, width: 64 },
  recipeName: { color: ChefColors.ink, fontSize: 15, fontWeight: "900" },
  muted: { color: ChefColors.muted, fontSize: 13 },
  emptySlot: {
    alignItems: "center",
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.md,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
  },
});
