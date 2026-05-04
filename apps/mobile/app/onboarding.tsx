import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { ChefChip } from "@/components/chef-chip";
import { ChefColors, ChefRadius } from "@/constants/chef-theme";
import { loadOnboardingLookups, saveOnboarding } from "@/lib/api";
import {
  applianceOptions,
  avoidOptions,
  discoveryOptions,
  flavorOptions,
  goalOptions,
  householdOptions,
  proteinOptions,
  storeOptions,
} from "@/lib/onboarding-options";
import type { Cuisine, Tag } from "@/lib/types";

const appLogo = require("@/assets/images/butter-me-logo.png");

type FormState = {
  household_size: string | null;
  preferred_cuisine_ids: string[];
  preferred_tag_ids: string[];
  favorite_proteins: string[];
  favorite_flavors: string[];
  disliked_ingredients: string[];
  available_appliances: string[];
  goal_priorities: string[];
  preferred_stores: string[];
  recipe_discovery_sources: string[];
  shopping_location_zip: string;
  shopping_location_label: string;
};

const initialForm: FormState = {
  household_size: null,
  preferred_cuisine_ids: [],
  preferred_tag_ids: [],
  favorite_proteins: [],
  favorite_flavors: [],
  disliked_ingredients: [],
  available_appliances: [],
  goal_priorities: [],
  preferred_stores: [],
  recipe_discovery_sources: [],
  shopping_location_zip: "",
  shopping_location_label: "",
};

const steps = [
  { title: "Who should Butter me plan for?", subtitle: "Set the default serving context." },
  { title: "What food feels like you?", subtitle: "Cuisine and dietary defaults." },
  { title: "What should Butter me reach for first?", subtitle: "Soft taste preferences." },
  { title: "What should Butter me avoid?", subtitle: "Dislikes for recipe ranking." },
  { title: "Your kitchen reality", subtitle: "Equipment and constraints." },
  { title: "What should Butter me optimize for?", subtitle: "Prioritized planning goals." },
  { title: "How do you shop?", subtitle: "Budget and store defaults." },
  { title: "How should Butter me help first?", subtitle: "Guide future agent behavior." },
  { title: "Where should Butter me build your cart?", subtitle: "Store availability and cart accuracy." },
];

const goalToMemoryGoal: Record<string, string> = {
  save_money: "save_money",
  eat_healthier: "eat_healthier",
  build_muscle: "hit_protein",
  reduce_food_waste: "reduce_waste",
  try_new_cuisines: "try_new_foods",
  cook_faster: "save_time",
};

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function ChipGroup({
  options,
  values,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => (
        <ChefChip
          key={option.value}
          label={option.label}
          selected={values.includes(option.value)}
          onPress={() => onChange(toggleValue(values, option.value))}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await loadOnboardingLookups();
      setCuisines(result.cuisines);
      setTags(result.tags.filter((tag) => tag.kind === "dietary_badge"));
      setMessage(result.error);
      setLoading(false);
    }

    void load();
  }, []);

  const copy = steps[step];
  const memoryItems = useMemo(() => {
    const items: string[] = [];
    const household = householdOptions.find((option) => option.value === form.household_size);
    if (household) items.push(`Planning for ${household.label}`);
    if (form.favorite_proteins.length) items.push(`${form.favorite_proteins.length} proteins saved`);
    if (form.goal_priorities.length) items.push(`${form.goal_priorities.length} goals prioritized`);
    if (form.preferred_stores.length) items.push(`${form.preferred_stores.length} stores selected`);
    if (form.shopping_location_zip) items.push(`ZIP ${form.shopping_location_zip}`);
    return items;
  }, [form]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function finish() {
    setSaving(true);
    setMessage(null);
    const shoppingLocation =
      form.shopping_location_zip || form.shopping_location_label
        ? {
            zip_code: form.shopping_location_zip || undefined,
            label: form.shopping_location_label || undefined,
          }
        : undefined;

    const result = await saveOnboarding({
      preferences: {
        household_size: form.household_size ?? undefined,
        preferred_cuisine_ids: form.preferred_cuisine_ids,
        preferred_tag_ids: form.preferred_tag_ids,
        favorite_proteins: form.favorite_proteins,
        favorite_flavors: form.favorite_flavors,
        available_appliances: form.available_appliances,
        preferred_stores: form.preferred_stores,
        recipe_discovery_sources: form.recipe_discovery_sources,
        shopping_location: shoppingLocation,
      },
      food_rules: form.disliked_ingredients.map((ingredient) => ({
        kind: "ingredient_preference",
        label: ingredient,
        action: "dislike",
        strictness: "soft",
        active: true,
        source: "onboarding",
        confidence: "high",
      })),
      goals: form.goal_priorities.map((goal, index) => ({
        goal: goalToMemoryGoal[goal] ?? goal,
        priority: index + 1,
        active: true,
        timeframe: "default",
        source: "onboarding",
        confidence: "high",
      })),
    });
    setSaving(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }

    router.replace("/(tabs)");
  }

  function next() {
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    void finish();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View>
            <View style={styles.brandRow}>
              <Image contentFit="cover" source={appLogo} style={styles.logo} />
              <Text style={styles.brand}>Butter me</Text>
            </View>
            <Text style={styles.subtitle}>Onboarding memory</Text>
          </View>
          {loading ? <ActivityIndicator color={ChefColors.primary} /> : null}
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / steps.length) * 100}%` }]} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.stepCount}>
            Step {step + 1} of {steps.length}
          </Text>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>

        {message ? <Text style={styles.notice}>{message}</Text> : null}

        <View style={styles.panel}>
          {step === 0 ? (
            <View style={styles.chips}>
              {householdOptions.map((option) => (
                <ChefChip
                  key={option.value}
                  label={option.label}
                  selected={form.household_size === option.value}
                  onPress={() => patch("household_size", option.value)}
                />
              ))}
            </View>
          ) : null}

          {step === 1 ? (
            <>
              <Text style={styles.groupTitle}>Cuisines</Text>
              <ChipGroup
                options={cuisines.slice(0, 16).map((cuisine) => ({
                  value: cuisine.id,
                  label: cuisine.label,
                }))}
                values={form.preferred_cuisine_ids}
                onChange={(values) => patch("preferred_cuisine_ids", values)}
              />
              <Text style={styles.groupTitle}>Dietary tags</Text>
              <ChipGroup
                options={tags.slice(0, 12).map((tag) => ({ value: tag.id, label: tag.name }))}
                values={form.preferred_tag_ids}
                onChange={(values) => patch("preferred_tag_ids", values)}
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Text style={styles.groupTitle}>Proteins</Text>
              <ChipGroup
                options={proteinOptions}
                values={form.favorite_proteins}
                onChange={(values) => patch("favorite_proteins", values)}
              />
              <Text style={styles.groupTitle}>Flavors</Text>
              <ChipGroup
                options={flavorOptions}
                values={form.favorite_flavors}
                onChange={(values) => patch("favorite_flavors", values)}
              />
            </>
          ) : null}

          {step === 3 ? (
            <ChipGroup
              options={avoidOptions}
              values={form.disliked_ingredients}
              onChange={(values) => patch("disliked_ingredients", values)}
            />
          ) : null}

          {step === 4 ? (
            <ChipGroup
              options={applianceOptions}
              values={form.available_appliances}
              onChange={(values) => patch("available_appliances", values)}
            />
          ) : null}

          {step === 5 ? (
            <ChipGroup
              options={goalOptions}
              values={form.goal_priorities}
              onChange={(values) => patch("goal_priorities", values)}
            />
          ) : null}

          {step === 6 ? (
            <ChipGroup
              options={storeOptions}
              values={form.preferred_stores}
              onChange={(values) => patch("preferred_stores", values)}
            />
          ) : null}

          {step === 7 ? (
            <ChipGroup
              options={discoveryOptions}
              values={form.recipe_discovery_sources}
              onChange={(values) => patch("recipe_discovery_sources", values)}
            />
          ) : null}

          {step === 8 ? (
            <View style={styles.inputs}>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) => patch("shopping_location_zip", value)}
                placeholder="ZIP code"
                placeholderTextColor={ChefColors.muted}
                style={styles.input}
                value={form.shopping_location_zip}
              />
              <TextInput
                onChangeText={(value) => patch("shopping_location_label", value)}
                placeholder="Location label, e.g. Home"
                placeholderTextColor={ChefColors.muted}
                style={styles.input}
                value={form.shopping_location_label}
              />
            </View>
          ) : null}
        </View>

        {memoryItems.length > 0 ? (
          <View style={styles.memory}>
            <Text style={styles.groupTitle}>Butter me will remember</Text>
            {memoryItems.map((item) => (
              <View key={item} style={styles.memoryItem}>
                <Ionicons color={ChefColors.primary} name="checkmark-circle" size={16} />
                <Text style={styles.memoryText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            disabled={step === 0}
            onPress={() => setStep((current) => Math.max(0, current - 1))}
            style={[styles.secondaryButton, step === 0 ? styles.disabledButton : null]}>
            <Text style={styles.secondaryText}>Back</Text>
          </Pressable>
          <Pressable disabled={saving} onPress={next} style={styles.primaryButton}>
            {saving ? <ActivityIndicator color="#fff" /> : null}
            <Text style={styles.primaryText}>{step === steps.length - 1 ? "Save memory" : "Continue"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: ChefColors.background,
    flex: 1,
  },
  content: {
    gap: 20,
    padding: 20,
    paddingBottom: 120,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    color: ChefColors.accent,
    fontSize: 24,
    fontWeight: "900",
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  logo: {
    borderRadius: 12,
    height: 38,
    width: 38,
  },
  progressTrack: {
    backgroundColor: ChefColors.outline,
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: ChefColors.primary,
    height: "100%",
  },
  hero: {
    gap: 7,
  },
  stepCount: {
    color: ChefColors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: ChefColors.ink,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 36,
  },
  subtitle: {
    color: ChefColors.muted,
    fontSize: 15,
  },
  notice: {
    backgroundColor: ChefColors.primarySoft,
    borderRadius: ChefRadius.sm,
    color: ChefColors.primary,
    padding: 12,
  },
  panel: {
    backgroundColor: ChefColors.surface,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.xl,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  groupTitle: {
    color: ChefColors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  inputs: {
    gap: 12,
  },
  input: {
    backgroundColor: ChefColors.surfaceMuted,
    borderColor: ChefColors.outline,
    borderRadius: ChefRadius.md,
    borderWidth: 1,
    color: ChefColors.ink,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  memory: {
    backgroundColor: ChefColors.primarySoft,
    borderRadius: ChefRadius.lg,
    gap: 10,
    padding: 16,
  },
  memoryItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  memoryText: {
    color: ChefColors.primary,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: ChefColors.outline,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  disabledButton: {
    opacity: 0.4,
  },
  secondaryText: {
    color: ChefColors.primary,
    fontWeight: "900",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: ChefColors.primary,
    borderRadius: 999,
    flex: 1.5,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "900",
  },
});
