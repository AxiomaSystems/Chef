import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChefColors, ChefRadius } from "@/constants/chef-theme";
import {
  importRecipeFromUrl,
  loadOnboardingLookups,
  saveImportedRecipe,
  type ImportedRecipeResult,
} from "@/lib/api";
import type { Cuisine } from "@/lib/types";

export default function ImportScreen() {
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [imported, setImported] = useState<ImportedRecipeResult | null>(null);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function importRecipe() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    const [result, lookups] = await Promise.all([
      importRecipeFromUrl({ url: trimmed, supplementalText: notes.trim() || undefined }),
      loadOnboardingLookups(),
    ]);
    setImported(result.data);
    setCuisines(lookups.cuisines);
    setError(result.error ?? lookups.error);
    setLoading(false);
  }

  async function saveRecipe() {
    if (!imported) return;
    setSaving(true);
    const result = await saveImportedRecipe(imported, cuisines);
    if (!result.error) {
      setImported(null);
      setUrl("");
      setNotes("");
    }
    setError(result.error);
    setSaving(false);
  }

  const recipe = imported?.imported_recipe;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Import</Text>
          <Text style={styles.subtitle}>Paste a recipe link and Chef will structure it for cooking.</Text>
        </View>

        {error ? <Text style={styles.notice}>{error}</Text> : null}

        <View style={styles.inputCard}>
          <View style={styles.platforms}>
            {["YouTube", "TikTok", "Instagram", "Web"].map((platform) => (
              <Text key={platform} style={styles.platform}>
                {platform}
              </Text>
            ))}
          </View>
          <TextInput
            autoCapitalize="none"
            keyboardType="url"
            onChangeText={setUrl}
            placeholder="https://..."
            placeholderTextColor={ChefColors.muted}
            style={styles.input}
            value={url}
          />
          <TextInput
            multiline
            onChangeText={setNotes}
            placeholder="Caption or transcript, optional"
            placeholderTextColor={ChefColors.muted}
            style={[styles.input, styles.notes]}
            value={notes}
          />
          <Pressable disabled={loading || !url.trim()} onPress={importRecipe} style={styles.primaryButton}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons color="#fff" name="sparkles-outline" size={18} />
            )}
            <Text style={styles.primaryButtonText}>{loading ? "Importing" : "Import Recipe"}</Text>
          </Pressable>
        </View>

        {recipe ? (
          <View style={styles.previewCard}>
            <Text style={styles.eyebrow}>{imported.platform}</Text>
            <Text style={styles.recipeTitle}>{recipe.name}</Text>
            <Text style={styles.muted}>
              {recipe.cuisine} - {recipe.servings} servings
            </Text>
            <Text style={styles.description}>{recipe.description}</Text>

            <View style={styles.previewGrid}>
              <View style={styles.previewStat}>
                <Text style={styles.statNumber}>{recipe.ingredients.length}</Text>
                <Text style={styles.muted}>ingredients</Text>
              </View>
              <View style={styles.previewStat}>
                <Text style={styles.statNumber}>{recipe.steps.length}</Text>
                <Text style={styles.muted}>steps</Text>
              </View>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {recipe.ingredients.slice(0, 6).map((ingredient) => (
                <Text key={`${ingredient.canonical_ingredient}-${ingredient.unit}`} style={styles.lineItem}>
                  {ingredient.amount} {ingredient.unit}{" "}
                  {ingredient.display_ingredient ?? ingredient.canonical_ingredient}
                </Text>
              ))}
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.sectionTitle}>Steps</Text>
              {recipe.steps.slice(0, 3).map((step) => (
                <Text key={step.step} style={styles.lineItem}>
                  {step.step}. {step.what_to_do}
                </Text>
              ))}
            </View>

            <Pressable disabled={saving} onPress={saveRecipe} style={styles.saveButton}>
              {saving ? <ActivityIndicator color="#fff" /> : <Ionicons color="#fff" name="save-outline" size={18} />}
              <Text style={styles.primaryButtonText}>{saving ? "Saving" : "Save to Recipes"}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: ChefColors.background, flex: 1 },
  content: { gap: 18, padding: 20, paddingBottom: 120 },
  header: { gap: 4 },
  title: { color: ChefColors.ink, fontSize: 34, fontWeight: "900" },
  subtitle: { color: ChefColors.muted, fontSize: 15, lineHeight: 21 },
  notice: {
    backgroundColor: ChefColors.primarySoft,
    borderRadius: ChefRadius.sm,
    color: ChefColors.primary,
    padding: 12,
  },
  inputCard: {
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  platforms: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  platform: {
    backgroundColor: ChefColors.primarySoft,
    borderRadius: 999,
    color: ChefColors.primary,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  input: {
    backgroundColor: ChefColors.surfaceMuted,
    borderRadius: ChefRadius.md,
    color: ChefColors.ink,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  notes: { minHeight: 96, textAlignVertical: "top" },
  primaryButton: {
    alignItems: "center",
    backgroundColor: ChefColors.primary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    paddingVertical: 14,
  },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  previewCard: {
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.lg,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  eyebrow: { color: ChefColors.primary, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  recipeTitle: { color: ChefColors.ink, fontSize: 24, fontWeight: "900", lineHeight: 29 },
  muted: { color: ChefColors.muted, fontSize: 13 },
  description: { color: ChefColors.ink, fontSize: 15, lineHeight: 22 },
  previewGrid: { flexDirection: "row", gap: 10 },
  previewStat: {
    backgroundColor: ChefColors.surfaceMuted,
    borderRadius: ChefRadius.md,
    flex: 1,
    padding: 14,
  },
  statNumber: { color: ChefColors.primary, fontSize: 24, fontWeight: "900" },
  previewSection: { gap: 8 },
  sectionTitle: { color: ChefColors.ink, fontSize: 17, fontWeight: "900" },
  lineItem: { color: ChefColors.muted, fontSize: 14, lineHeight: 20 },
  saveButton: {
    alignItems: "center",
    backgroundColor: ChefColors.primary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 4,
    paddingVertical: 14,
  },
});
