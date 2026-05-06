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
import { createCartFromRecipes, createShoppingCart, loadRecipesData } from "@/lib/api";
import type { BaseRecipe, User } from "@/lib/types";

const tabs = ["mine", "public", "saved"] as const;
type RecipeTab = (typeof tabs)[number];

export default function RecipesScreen() {
  const [activeTab, setActiveTab] = useState<RecipeTab>("mine");
  const [recipes, setRecipes] = useState<BaseRecipe[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await loadRecipesData();
    setRecipes(result.recipes);
    setUser(result.user);
    setError(result.error);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredRecipes = useMemo(() => {
    if (activeTab === "mine") {
      return recipes.filter((recipe) => recipe.is_owner || recipe.user_id === user?.id);
    }
    if (activeTab === "saved") {
      return recipes.filter((recipe) => recipe.is_saved && !(recipe.is_owner || recipe.user_id === user?.id));
    }
    return recipes.filter((recipe) => !(recipe.is_owner || recipe.user_id === user?.id));
  }, [activeTab, recipes, user?.id]);

  const selectedRecipes = recipes.filter((recipe) => selectedIds.has(recipe.id));

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function generateCart() {
    if (selectedRecipes.length === 0) return;
    setSaving(true);
    const cart = await createCartFromRecipes(selectedRecipes);
    if (cart.data?.id) {
      await createShoppingCart(cart.data.id);
      setSelectedIds(new Set());
    }
    setError(cart.error);
    setSaving(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Recipes</Text>
            <Text style={styles.subtitle}>Cook from your collection, public dishes, or saved ideas.</Text>
          </View>
          {loading ? <ActivityIndicator color={ChefColors.primary} /> : null}
        </View>

        {error ? <Text style={styles.notice}>{error}</Text> : null}

        <View style={styles.segment}>
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.segmentButton, activeTab === tab ? styles.segmentButtonActive : null]}>
              <Text style={[styles.segmentText, activeTab === tab ? styles.segmentTextActive : null]}>
                {tab === "mine" ? "My" : tab === "public" ? "Public" : "Saved"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.list}>
          {filteredRecipes.map((recipe) => {
            const selected = selectedIds.has(recipe.id);
            return (
              <Pressable
                key={recipe.id}
                onPress={() => toggleSelected(recipe.id)}
                style={[styles.recipeRow, selected ? styles.recipeRowSelected : null]}>
                {recipe.cover_image_url ? (
                  <Image source={{ uri: recipe.cover_image_url }} style={styles.recipeImage} contentFit="cover" />
                ) : (
                  <View style={[styles.recipeImage, styles.placeholder]}>
                    <Text style={styles.placeholderText}>{recipe.name.slice(0, 1)}</Text>
                  </View>
                )}
                <View style={styles.recipeBody}>
                  <View style={styles.recipeMetaRow}>
                    <Text style={styles.recipeMeta}>{recipe.cuisine?.label ?? "Recipe"}</Text>
                    {recipe.nutrition_data?.calories ? (
                      <Text style={styles.recipeMeta}>{recipe.nutrition_data.calories} kcal</Text>
                    ) : null}
                  </View>
                  <Text numberOfLines={2} style={styles.recipeName}>
                    {recipe.name}
                  </Text>
                  <Text style={styles.muted}>
                    {recipe.servings} servings
                    {recipe.ingredients?.length ? ` - ${recipe.ingredients.length} ingredients` : ""}
                  </Text>
                </View>
                <View style={[styles.check, selected ? styles.checkActive : null]}>
                  {selected ? <Ionicons color="#fff" name="checkmark" size={16} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {!loading && filteredRecipes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons color={ChefColors.primary} name="book-outline" size={28} />
            <Text style={styles.emptyTitle}>No recipes here yet</Text>
            <Text style={styles.emptyText}>Create or save recipes on web and they will show up here.</Text>
          </View>
        ) : null}
      </ScrollView>

      {selectedRecipes.length > 0 ? (
        <View style={styles.builderBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.builderTitle}>{selectedRecipes.length} selected</Text>
            <Text numberOfLines={1} style={styles.builderSub}>
              {selectedRecipes.map((recipe) => recipe.name).join(", ")}
            </Text>
          </View>
          <Pressable disabled={saving} onPress={generateCart} style={styles.builderButton}>
            {saving ? (
              <ActivityIndicator color={ChefColors.ink} />
            ) : (
              <Ionicons color={ChefColors.ink} name="cart-outline" size={18} />
            )}
            <Text style={styles.builderButtonText}>Cart</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: ChefColors.background, flex: 1 },
  content: { gap: 18, padding: 20, paddingBottom: 136 },
  header: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  title: { color: ChefColors.ink, fontSize: 34, fontWeight: "900" },
  subtitle: { color: ChefColors.muted, fontSize: 15, lineHeight: 21, marginTop: 4 },
  notice: {
    backgroundColor: ChefColors.primarySoft,
    borderRadius: ChefRadius.sm,
    color: ChefColors.primary,
    padding: 12,
  },
  segment: {
    backgroundColor: ChefColors.surfaceMuted,
    borderRadius: 999,
    flexDirection: "row",
    padding: 4,
  },
  segmentButton: { alignItems: "center", borderRadius: 999, flex: 1, paddingVertical: 11 },
  segmentButtonActive: { backgroundColor: ChefColors.surface },
  segmentText: { color: ChefColors.muted, fontSize: 13, fontWeight: "900" },
  segmentTextActive: { color: ChefColors.ink },
  list: { gap: 12 },
  recipeRow: {
    alignItems: "center",
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    padding: 10,
  },
  recipeRowSelected: { borderColor: ChefColors.primary, backgroundColor: ChefColors.primarySoft },
  recipeImage: { borderRadius: ChefRadius.md, height: 88, width: 94 },
  placeholder: { alignItems: "center", backgroundColor: ChefColors.primarySoft, justifyContent: "center" },
  placeholderText: { color: ChefColors.primary, fontSize: 30, fontWeight: "900" },
  recipeBody: { flex: 1, gap: 5 },
  recipeMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  recipeMeta: { color: ChefColors.primary, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  recipeName: { color: ChefColors.ink, fontSize: 17, fontWeight: "900", lineHeight: 21 },
  muted: { color: ChefColors.muted, fontSize: 13 },
  check: {
    alignItems: "center",
    borderColor: ChefColors.outline,
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  checkActive: { backgroundColor: ChefColors.primary, borderColor: ChefColors.primary },
  empty: {
    alignItems: "center",
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.lg,
    borderWidth: 1,
    gap: 7,
    padding: 28,
  },
  emptyTitle: { color: ChefColors.ink, fontSize: 18, fontWeight: "900" },
  emptyText: { color: ChefColors.muted, fontSize: 14, textAlign: "center" },
  builderBar: {
    alignItems: "center",
    backgroundColor: ChefColors.dark,
    borderRadius: ChefRadius.lg,
    bottom: 104,
    flexDirection: "row",
    gap: 14,
    left: 16,
    padding: 16,
    position: "absolute",
    right: 16,
  },
  builderTitle: { color: "#fff", fontSize: 15, fontWeight: "900" },
  builderSub: { color: "rgba(255,255,255,0.68)", fontSize: 12, marginTop: 3 },
  builderButton: {
    alignItems: "center",
    backgroundColor: ChefColors.accent,
    borderRadius: ChefRadius.sm,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  builderButtonText: { color: ChefColors.ink, fontSize: 13, fontWeight: "900" },
});
