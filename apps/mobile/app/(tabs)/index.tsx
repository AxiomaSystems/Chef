import { Ionicons } from "@expo/vector-icons";
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
import { RecipeCard } from "@/components/recipe-card";
import { loadDashboardData } from "@/lib/api";
import type { BaseRecipe, Cart, ShoppingCart, User } from "@/lib/types";

const demoRecipes: BaseRecipe[] = [
  {
    id: "demo-biryani",
    name: "Authentic Chicken Biryani At Home",
    description: "Fragrant rice, tender chicken, and warm spices.",
    cover_image_url: "https://www.themealdb.com/images/media/meals/xrttsx1487339558.jpg",
    servings: 4,
    cuisine: { id: "indian", label: "Indian", slug: "indian" },
    nutrition_data: { calories: 620 },
    ingredients: new Array(14).fill(null).map((_, index) => ({
      canonical_ingredient: `ingredient-${index}`,
      amount: 1,
      unit: "unit",
    })),
  },
  {
    id: "demo-jollof",
    name: "Jollof Rice",
    cover_image_url: "https://www.themealdb.com/images/media/meals/wtsvxx1511296896.jpg",
    servings: 2,
    cuisine: { id: "west-african", label: "West African", slug: "west-african" },
    nutrition_data: { calories: 520 },
  },
];

export default function DashboardScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<BaseRecipe[]>(demoRecipes);
  const [carts, setCarts] = useState<Cart[]>([]);
  const [shoppingCarts, setShoppingCarts] = useState<ShoppingCart[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<BaseRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await loadDashboardData();
    if (result.recipes.length > 0) setRecipes(result.recipes);
    setUser(result.user);
    setCarts(result.carts);
    setShoppingCarts(result.shoppingCarts);
    setError(result.error);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const featuredRecipe = recipes[0] ?? null;
  const quickRecipes = recipes.slice(1).length > 0 ? recipes.slice(1) : recipes;
  const latestCart = shoppingCarts[0] ?? null;
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const selectedIds = useMemo(
    () => new Set(selectedRecipes.map((recipe) => recipe.id)),
    [selectedRecipes],
  );

  function toggleRecipe(recipe: BaseRecipe) {
    setSelectedRecipes((current) =>
      current.some((item) => item.id === recipe.id)
        ? current.filter((item) => item.id !== recipe.id)
        : [...current, recipe],
    );
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View style={styles.header}>
          <Text style={styles.brand}>Chef</Text>
          <Text style={styles.kicker}>Meal Execution Platform</Text>
        </View>

        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.title}>Welcome, {firstName}!</Text>
            <Text style={styles.subtitle}>What are you planning to cook this week?</Text>
          </View>
          {loading ? <ActivityIndicator color={ChefColors.primary} /> : null}
        </View>

        {error ? <Text style={styles.notice}>{error}</Text> : null}

        {featuredRecipe ? (
          <RecipeCard
            featured
            recipe={featuredRecipe}
            onAdd={() => toggleRecipe(featuredRecipe)}
          />
        ) : null}

        <View style={styles.cartCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Your Carts</Text>
            <Ionicons color={ChefColors.primary} name="cart-outline" size={22} />
          </View>
          {latestCart ? (
            <View style={styles.latestCart}>
              <View>
                <Text style={styles.eyebrow}>Latest order</Text>
                <Text style={styles.cartName}>{latestCart.retailer} Cart</Text>
                <Text style={styles.muted}>{latestCart.matched_items.length} items</Text>
              </View>
              <Text style={styles.price}>~${latestCart.estimated_subtotal.toFixed(2)}</Text>
            </View>
          ) : (
            <Text style={styles.muted}>No shopping carts yet. Generate one from recipes soon.</Text>
          )}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{carts.length}</Text>
              <Text style={styles.muted}>Carts built</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{shoppingCarts.length}</Text>
              <Text style={styles.muted}>Orders ready</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Quick Recipe Ideas</Text>
            <Text style={styles.subtitle}>Pick something to cook tonight</Text>
          </View>
        </View>

        <View style={styles.recipeGrid}>
          {quickRecipes.map((recipe) => (
            <Pressable key={recipe.id} onPress={() => toggleRecipe(recipe)}>
              <RecipeCard recipe={recipe} />
              {selectedIds.has(recipe.id) ? (
                <View style={styles.selectedPill}>
                  <Ionicons color="#fff" name="checkmark" size={14} />
                  <Text style={styles.selectedPillText}>Selected</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {selectedRecipes.length > 0 ? (
        <View style={styles.builderBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.builderTitle}>
              {selectedRecipes.length} recipe{selectedRecipes.length === 1 ? "" : "s"} selected
            </Text>
            <Text numberOfLines={1} style={styles.builderSub}>
              {selectedRecipes.map((recipe) => recipe.name).join(", ")}
            </Text>
          </View>
          <Pressable style={styles.builderButton}>
            <Ionicons color={ChefColors.ink} name="cart-outline" size={18} />
            <Text style={styles.builderButtonText}>Generate</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: ChefColors.background,
    flex: 1,
  },
  content: {
    gap: 22,
    padding: 20,
    paddingBottom: 130,
  },
  header: {
    gap: 2,
  },
  brand: {
    color: ChefColors.accent,
    fontSize: 24,
    fontWeight: "900",
  },
  kicker: {
    color: ChefColors.muted,
    fontSize: 12,
  },
  greetingRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    color: ChefColors.ink,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
  },
  subtitle: {
    color: ChefColors.muted,
    fontSize: 16,
    marginTop: 3,
  },
  notice: {
    backgroundColor: ChefColors.primarySoft,
    borderRadius: ChefRadius.sm,
    color: ChefColors.primary,
    padding: 12,
  },
  cartCard: {
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.xl,
    borderWidth: 1,
    gap: 18,
    padding: 22,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: ChefColors.ink,
    fontSize: 24,
    fontWeight: "900",
  },
  latestCart: {
    alignItems: "center",
    backgroundColor: ChefColors.surfaceMuted,
    borderRadius: ChefRadius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  eyebrow: {
    color: ChefColors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  cartName: {
    color: ChefColors.ink,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 6,
  },
  muted: {
    color: ChefColors.muted,
    fontSize: 14,
  },
  price: {
    color: ChefColors.primary,
    fontSize: 22,
    fontWeight: "900",
  },
  stats: {
    flexDirection: "row",
    gap: 12,
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    color: ChefColors.primary,
    fontSize: 24,
    fontWeight: "900",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recipeGrid: {
    gap: 16,
  },
  selectedPill: {
    alignItems: "center",
    backgroundColor: ChefColors.primary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    right: 12,
    top: 12,
  },
  selectedPillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  builderBar: {
    alignItems: "center",
    backgroundColor: ChefColors.dark,
    borderRadius: ChefRadius.lg,
    bottom: 96,
    flexDirection: "row",
    gap: 14,
    left: 16,
    padding: 16,
    position: "absolute",
    right: 16,
  },
  builderTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
  },
  builderSub: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    marginTop: 3,
  },
  builderButton: {
    alignItems: "center",
    backgroundColor: ChefColors.accent,
    borderRadius: ChefRadius.sm,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  builderButtonText: {
    color: ChefColors.ink,
    fontSize: 13,
    fontWeight: "900",
  },
});
