"use client";

import { useState, useTransition } from "react";
import type { Cuisine, Tag } from "@cart/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePreferencesAndCompleteAction, skipOnboardingAction } from "./actions";

// ─── Static option sets ───────────────────────────────────────────────────────

const HOUSEHOLD_SIZES = ["Just me", "Me + 1 person", "3–4 people", "5 or more people"];

const KIDS_OPTIONS = [
  "No kids",
  "Yes — toddlers (under 5)",
  "Yes — kids (5–12)",
  "Yes — teenagers",
];

const PROTEINS = [
  "Chicken",
  "Beef",
  "Pork",
  "Salmon",
  "Shrimp",
  "Tuna",
  "Lamb",
  "Turkey",
  "Tofu",
  "Tempeh",
  "Eggs",
  "Lentils / Beans",
  "No preference",
];

const FLAVOR_PROFILES = [
  "Spicy",
  "Savory / Umami",
  "Sweet",
  "Tangy / Citrusy",
  "Smoky",
  "Herby / Fresh",
  "Rich / Creamy",
  "Nutty",
  "Garlicky",
];

const SPICE_LEVELS = [
  "No heat please",
  "A little kick is fine",
  "Medium heat",
  "Hot",
  "The hotter the better",
];

const DISLIKES = [
  "Mushrooms",
  "Olives",
  "Cilantro",
  "Anchovies",
  "Blue cheese",
  "Liver / Offal",
  "Eggplant",
  "Beets",
  "Brussels sprouts",
  "Capers",
  "Fennel",
  "Tofu",
  "Tempeh",
  "Kimchi",
  "Fish sauce",
  "Lamb",
  "Goat",
  "Pork",
  "Coconut",
  "Raw onion",
  "Sour cream",
  "Mayonnaise",
  "Avocado",
  "Chickpeas",
  "Lentils",
  "None of these",
  "Other",
];

const TEXTURES = [
  "Crunchy",
  "Chewy",
  "Crispy",
  "Soft",
  "Creamy",
  "Sticky",
  "Crunchy bones",
  "None of these",
];

const APPLIANCES_AVAILABLE = [
  "Stovetop",
  "Oven",
  "Air fryer",
  "Instant Pot / Pressure cooker",
  "Slow cooker",
  "Blender",
  "Food processor",
  "Grill / BBQ",
  "Wok",
  "Rice cooker",
  "Toaster oven",
  "Microwave",
  "Other",
];

const COOKING_TIMES_AVAILABLE = [
  "Under 15 minutes",
  "15–30 minutes",
  "30–45 minutes",
  "Up to an hour",
  "Several hours",
  "Depends",
];

const TYPICAL_TIMES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks",
  "Late night snacks",
  "Meal prep in batches",
  "Ingredient Prep",
];

const SKILL_LEVELS = [
  "Beginner — I follow a recipe step by step",
  "Intermediate — I improvise sometimes",
  "Confident — I cook most things from memory",
  "Advanced — I experiment freely",
];

const GOALS = [
  "Save money and stay on budget",
  "Eat healthier overall",
  "Lose weight",
  "Build muscle / eat more protein",
  "Reduce food waste",
  "Try new cuisines and flavors",
  "Cook faster on weeknights",
  "Eat more plant-based meals",
  "Manage a specific health condition",
];

const WEEKLY_BUDGET = [
  "Under $50",
  "$50–$100",
  "$100–$150",
  "$150–$200",
  "No real budget limit",
  "Other",
];

const PREFERRED_STORES = [
  "Walmart",
  "Kroger",
  "Aldi",
  "Whole Foods",
  "Trader Joe's",
  "Target",
  "Costco / Sam's Club",
  "Local / ethnic grocery",
  "Amazon Fresh",
  "Instacart",
];

const PREFERRED_SHOPPING_STYLE = [
  "I go in-store",
  "I do pickup",
  "I do delivery",
  "It depends",
];

const DISCOVERY_SOURCES = [
  "Social Media (TikToks, Instagram Reels, Posts and Stories)",
  "YouTube",
  "Pinterest",
  "Food blogs and websites",
  "Friends or family",
  "Cookbooks",
  "Restaurant dishes I want to recreate",
];

const FRUSTRATIONS = [
  "I save recipes everywhere but never actually cook them",
  "I never know what to make",
  "Grocery runs are disorganized and stressful",
  "I spend way too much money on food",
  "I make mistakes mid-cook and don't know how to fix them",
  "I keep making the same 5 meals on rotation",
];

const TRACKING_OPTIONS = [
  "No, not for me",
  "Casually — I just stay aware",
  "Yes — I track calories",
  "Yes — I track full macros (protein, carbs, and fat)",
];

// ─── Step config ───────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Who", title: "Who are you cooking for?", subtitle: "Helps us size portions and plan meals." },
  { label: "Cuisines", title: "What cuisines do you love?", subtitle: "Pick as many as you like. We'll tailor your recipe feed." },
  { label: "Diet", title: "Any dietary needs?", subtitle: "Hard filters — recipes that break these won't appear." },
  { label: "Favorites", title: "What do you love?", subtitle: "Chef will prioritize these in your recommendations." },
  { label: "Dislikes", title: "What do you hate?", subtitle: "Soft filters — you can still override these per recipe." },
  { label: "Kitchen", title: "Tell us about your kitchen.", subtitle: "Helps Chef suggest realistic recipes for your setup." },
  { label: "Goals", title: "What are your goals?", subtitle: "Shapes how Chef recommends and modifies recipes." },
  { label: "Shopping", title: "How do you shop?", subtitle: "Chef builds your grocery cart around this." },
  { label: "Discovery", title: "How do you find recipes?", subtitle: "Helps personalize your import experience." },
];

export function OnboardingClient({
  cuisines,
  dietaryTags,
}: {
  cuisines: Cuisine[];
  dietaryTags: Tag[];
}) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  // ─── State for all steps ─────────────────────────────────────────────────
  const [selectedCuisineIds, setSelectedCuisineIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [householdSize, setHouseholdSize] = useState("");
  const [kidsProfile, setKidsProfile] = useState("");
  const [selectedProteins, setSelectedProteins] = useState<string[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [spiceLevel, setSpiceLevel] = useState("");
  const [selectedDislikes, setSelectedDislikes] = useState<string[]>([]);
  const [selectedTextures, setSelectedTextures] = useState<string[]>([]);
  const [selectedAppliances, setSelectedAppliances] = useState<string[]>([]);
  const [cookingTime, setCookingTime] = useState("");
  const [selectedMealTimes, setSelectedMealTimes] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [trackingMode, setTrackingMode] = useState("");
  const [weeklyBudget, setWeeklyBudget] = useState("");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [shoppingMode, setShoppingMode] = useState("");
  const [selectedDiscoverySources, setSelectedDiscoverySources] = useState<string[]>([]);
  const [selectedFrustration, setSelectedFrustration] = useState("");
  const [zip, setZip] = useState("");

  // ─── Toggle helpers ─────────────────────────────────────────────────────
  function toggleFromList(
    item: string,
    selectedList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
  ) {
    setList((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  }

  // ─── Navigation ───────────────────────────────────────────────────────
  function handleNext() {
    if (step < STEPS.length) setStep((s) => s + 1);
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  function handleFinish() {
    setError(undefined);
    startTransition(async () => {
      const fd = new FormData();

      // Step 1: Who
      if (householdSize) fd.set("household_size", householdSize);
      if (kidsProfile) fd.set("kids_profile", kidsProfile);

      // Step 2: Cuisines
      selectedCuisineIds.forEach((id) => fd.append("preferred_cuisine_ids", id));

      // Step 3: Diet
      selectedTagIds.forEach((id) => fd.append("preferred_tag_ids", id));

      // Step 4: Favorites
      selectedProteins.forEach((v) => fd.append("favorite_proteins", v));
      selectedFlavors.forEach((v) => fd.append("favorite_flavors", v));
      if (spiceLevel) fd.set("spice_level", spiceLevel);

      // Step 5: Dislikes
      selectedDislikes.forEach((v) => fd.append("disliked_ingredients", v));
      selectedTextures.forEach((v) => fd.append("disliked_textures", v));

      // Step 6: Kitchen
      if (skillLevel) fd.set("cooking_skill_level", skillLevel);
      selectedAppliances.forEach((v) => fd.append("available_appliances", v));
      if (cookingTime) fd.set("preferred_cooking_time", cookingTime);
      selectedMealTimes.forEach((v) => fd.append("typical_meal_times", v));

      // Step 7: Goals
      selectedGoals.forEach((v) => fd.append("goal_priorities", v));
      if (trackingMode) fd.set("calorie_tracking_mode", trackingMode);
      if (weeklyBudget) fd.set("weekly_budget", weeklyBudget);

      // Step 8: Shopping
      selectedStores.forEach((v) => fd.append("preferred_stores", v));
      if (shoppingMode) fd.set("shopping_mode", shoppingMode);

      // Step 9: Discovery
      selectedDiscoverySources.forEach((v) =>
        fd.append("recipe_discovery_sources", v),
      );
      if (selectedFrustration) fd.set("biggest_cooking_frustration", selectedFrustration);

      // Location (from original step 3)
      if (zip.trim()) {
        fd.set("shopping_location_zip_code", zip.trim());
        fd.set("shopping_location_label", `ZIP ${zip.trim()}`);
      }

      const result = await savePreferencesAndCompleteAction({}, fd);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleSkip() {
    if (step < STEPS.length) {
      setStep((s) => s + 1);
    } else {
      startTransition(async () => {
        await skipOnboardingAction();
      });
    }
  }

  const stepLabels = STEPS.map((s) => s.label);

  return (
    <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Brand */}
        <div className="text-center mb-8">
          <p className="text-headline-sm text-[#ffb38e] font-black tracking-tight">Chef</p>
          <p className="text-body-md text-[#52443d] mt-1">Let&apos;s set up your experience</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === step;
            const isDone = stepNum < step;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isActive
                        ? "w-10 bg-[#895032]"
                        : isDone
                          ? "w-6 bg-[#895032]/50"
                          : "w-6 bg-[#d7c2b9]"
                    }`}
                  />
                  <span
                    className={`text-label-sm transition-all ${
                      isActive ? "text-[#895032] font-semibold" : "text-[#85736c]"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className="w-6 h-px bg-[#d7c2b9] mb-4" />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(137,80,50,0.12)]">
          {/* Step 1: Who */}
          {step === 1 && (
            <div>
              <h2 className="text-headline-sm text-[#1a1c1a] font-bold">
                {STEPS[0].title}
              </h2>
              <p className="text-body-sm text-[#85736c] mt-1">{STEPS[0].subtitle}</p>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Household size
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {HOUSEHOLD_SIZES.map((size) => (
                      <button
                        key={size}
                        onClick={() => setHouseholdSize(size)}
                        className={`px-4 py-2 rounded-full text-label-md font-semibold transition-all active:scale-[0.97] ${
                          householdSize === size
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Kids in the household
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {KIDS_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setKidsProfile(opt)}
                        className={`px-4 py-2 rounded-full text-label-md font-semibold transition-all active:scale-[0.97] ${
                          kidsProfile === opt
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Cuisines */}
          {step === 2 && (
            <div>
              <h2 className="text-headline-sm text-[#1a1c1a] font-bold">
                {STEPS[1].title}
              </h2>
              <p className="text-body-sm text-[#85736c] mt-1">{STEPS[1].subtitle}</p>
              {cuisines.length === 0 ? (
                <p className="text-body-sm text-[#85736c] mt-6">Loading cuisines…</p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-6">
                  {cuisines.map((cuisine) => {
                    const isSelected = selectedCuisineIds.includes(cuisine.id);
                    return (
                      <button
                        key={cuisine.id}
                        onClick={() => toggleFromList(cuisine.id, selectedCuisineIds, setSelectedCuisineIds)}
                        className={`px-4 py-2 rounded-full text-label-md font-semibold transition-all active:scale-[0.97] ${
                          isSelected
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {cuisine.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Diet */}
          {step === 3 && (
            <div>
              <h2 className="text-headline-sm text-[#1a1c1a] font-bold">
                {STEPS[2].title}
              </h2>
              <p className="text-body-sm text-[#85736c] mt-1">{STEPS[2].subtitle}</p>
              {dietaryTags.length === 0 ? (
                <p className="text-body-sm text-[#85736c] mt-6">No dietary options available.</p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-6">
                  {dietaryTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleFromList(tag.id, selectedTagIds, setSelectedTagIds)}
                        className={`px-4 py-2 rounded-full text-label-md font-semibold transition-all active:scale-[0.97] ${
                          isSelected
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Favorites */}
          {step === 4 && (
            <div>
              <h2 className="text-headline-sm text-[#1a1c1a] font-bold">
                {STEPS[3].title}
              </h2>
              <p className="text-body-sm text-[#85736c] mt-1">{STEPS[3].subtitle}</p>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Favorite proteins
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PROTEINS.map((p) => (
                      <button
                        key={p}
                        onClick={() => toggleFromList(p, selectedProteins, setSelectedProteins)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          selectedProteins.includes(p)
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Flavor profiles you love
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FLAVOR_PROFILES.map((f) => (
                      <button
                        key={f}
                        onClick={() => toggleFromList(f, selectedFlavors, setSelectedFlavors)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          selectedFlavors.includes(f)
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Spice level
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SPICE_LEVELS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpiceLevel(s)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          spiceLevel === s
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Dislikes */}
          {step === 5 && (
            <div>
              <h2 className="text-headline-sm text-[#1a1c1a] font-bold">
                {STEPS[4].title}
              </h2>
              <p className="text-body-sm text-[#85736c] mt-1">{STEPS[4].subtitle}</p>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Ingredients you avoid
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DISLIKES.map((d) => (
                      <button
                        key={d}
                        onClick={() => toggleFromList(d, selectedDislikes, setSelectedDislikes)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          selectedDislikes.includes(d)
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Textures you dislike
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TEXTURES.map((t) => (
                      <button
                        key={t}
                        onClick={() => toggleFromList(t, selectedTextures, setSelectedTextures)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          selectedTextures.includes(t)
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Kitchen */}
          {step === 6 && (
            <div>
              <h2 className="text-headline-sm text-[#1a1c1a] font-bold">
                {STEPS[5].title}
              </h2>
              <p className="text-body-sm text-[#85736c] mt-1">{STEPS[5].subtitle}</p>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Cooking skill level
                  </p>
                  <div className="flex flex-col gap-2">
                    {SKILL_LEVELS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSkillLevel(s)}
                        className={`px-4 py-2 rounded-lg text-label-sm font-semibold text-left transition-all active:scale-[0.97] ${
                          skillLevel === s
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Appliances you have
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {APPLIANCES_AVAILABLE.map((a) => (
                      <button
                        key={a}
                        onClick={() => toggleFromList(a, selectedAppliances, setSelectedAppliances)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          selectedAppliances.includes(a)
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Preferred cooking time
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COOKING_TIMES_AVAILABLE.map((t) => (
                      <button
                        key={t}
                        onClick={() => setCookingTime(t)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          cookingTime === t
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    When do you typically cook?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TYPICAL_TIMES.map((t) => (
                      <button
                        key={t}
                        onClick={() => toggleFromList(t, selectedMealTimes, setSelectedMealTimes)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          selectedMealTimes.includes(t)
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Goals */}
          {step === 7 && (
            <div>
              <h2 className="text-headline-sm text-[#1a1c1a] font-bold">
                {STEPS[6].title}
              </h2>
              <p className="text-body-sm text-[#85736c] mt-1">{STEPS[6].subtitle}</p>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    What are your goals? (Select all that apply)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {GOALS.map((g) => (
                      <button
                        key={g}
                        onClick={() => toggleFromList(g, selectedGoals, setSelectedGoals)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          selectedGoals.includes(g)
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Do you track nutrition?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TRACKING_OPTIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTrackingMode(t)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          trackingMode === t
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Weekly grocery budget
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {WEEKLY_BUDGET.map((b) => (
                      <button
                        key={b}
                        onClick={() => setWeeklyBudget(b)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          weeklyBudget === b
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Shopping */}
          {step === 8 && (
            <div>
              <h2 className="text-headline-sm text-[#1a1c1a] font-bold">
                {STEPS[7].title}
              </h2>
              <p className="text-body-sm text-[#85736c] mt-1">{STEPS[7].subtitle}</p>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Preferred stores
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PREFERRED_STORES.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleFromList(s, selectedStores, setSelectedStores)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          selectedStores.includes(s)
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    Shopping style
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PREFERRED_SHOPPING_STYLE.map((s) => (
                      <button
                        key={s}
                        onClick={() => setShoppingMode(s)}
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          shoppingMode === s
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    ZIP Code (for store availability)
                  </p>
                  <Input
                    type="text"
                    placeholder="e.g. 60201"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    maxLength={5}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 9: Discovery */}
          {step === 9 && (
            <div>
              <h2 className="text-headline-sm text-[#1a1c1a] font-bold">
                {STEPS[8].title}
              </h2>
              <p className="text-body-sm text-[#85736c] mt-1">{STEPS[8].subtitle}</p>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    How do you discover recipes?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DISCOVERY_SOURCES.map((d) => (
                      <button
                        key={d}
                        onClick={() =>
                          toggleFromList(d, selectedDiscoverySources, setSelectedDiscoverySources)
                        }
                        className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-all active:scale-[0.97] ${
                          selectedDiscoverySources.includes(d)
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-label-md font-semibold text-[#52443d] mb-2">
                    What frustrates you most about cooking?
                  </p>
                  <div className="flex flex-col gap-2">
                    {FRUSTRATIONS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setSelectedFrustration(f)}
                        className={`px-4 py-2 rounded-lg text-label-sm font-semibold text-left transition-all active:scale-[0.97] ${
                          selectedFrustration === f
                            ? "bg-[#895032] text-white shadow-sm"
                            : "bg-[#f4f3f1] text-[#52443d] hover:bg-[#efe3b3]"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-body-sm text-[#ba1a1a] mt-6">{error}</p>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <div>
              {step > 1 ? (
                <button
                  onClick={handleBack}
                  disabled={isPending}
                  className="text-label-md text-[#52443d] hover:text-[#1a1c1a] flex items-center gap-1 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Back
                </button>
              ) : (
                <div />
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkip}
                disabled={isPending}
                className="text-label-md text-[#85736c] hover:text-[#52443d] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {step === STEPS.length ? "Skip" : "Skip"}
              </button>
              {step < STEPS.length ? (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  icon="arrow_forward"
                  iconPosition="right"
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleFinish}
                  icon={isPending ? "refresh" : "check"}
                  iconPosition="right"
                  disabled={isPending}
                >
                  {isPending ? "Saving…" : "Finish"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-body-sm text-[#85736c] mt-4">
          Step {step} of {STEPS.length}
        </p>
      </div>
    </main>
  );
}
