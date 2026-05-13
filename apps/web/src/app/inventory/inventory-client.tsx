"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import type { KitchenInventoryItem } from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { CameraModal } from "./camera-modal";
import {
  removeInventoryItemAction,
  createRestockCartAction,
  addInventoryItemAction,
  updateInventoryItemAction,
} from "./actions";
import { VisionScanModal } from "./vision-scan-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

type DisplayItem = {
  id: string;
  name: string;
  category: string;
  quantity: string;
  estimatedAmount?: number;
  unit?: string;
};

type IngredientCatalogEntry = {
  category: string;
  defaultUnit: string;
  defaultAmount: number;
};

// ─── Ingredient Catalog ───────────────────────────────────────────────────────

const INGREDIENT_CATALOG: { category: string; items: string[] }[] = [
  {
    category: "Proteins",
    items: [
      "Chicken Breast",
      "Chicken Thighs",
      "Ground Beef",
      "Beef Steak",
      "Pork Chops",
      "Bacon",
      "Salmon",
      "Tuna",
      "Shrimp",
      "Eggs",
      "Tofu",
      "Tempeh",
      "Lentils",
      "Chickpeas",
      "Black Beans",
      "Kidney Beans",
      "Edamame",
      "Turkey Breast",
      "Lamb Chops",
      "Sardines",
      "Crab",
      "Lobster",
      "Scallops",
      "Cod",
    ],
  },
  {
    category: "Vegetables",
    items: [
      "Onion",
      "Garlic",
      "Tomato",
      "Bell Pepper",
      "Broccoli",
      "Spinach",
      "Kale",
      "Carrot",
      "Celery",
      "Cucumber",
      "Zucchini",
      "Eggplant",
      "Mushrooms",
      "Asparagus",
      "Green Beans",
      "Peas",
      "Corn",
      "Cauliflower",
      "Brussels Sprouts",
      "Cabbage",
      "Lettuce",
      "Arugula",
      "Sweet Potato",
      "Potato",
      "Beet",
      "Artichoke",
      "Leek",
      "Bok Choy",
      "Radish",
      "Turnip",
      "Parsnip",
    ],
  },
  {
    category: "Fruits",
    items: [
      "Apple",
      "Banana",
      "Lemon",
      "Lime",
      "Orange",
      "Strawberry",
      "Blueberry",
      "Raspberry",
      "Mango",
      "Avocado",
      "Grapes",
      "Pineapple",
      "Watermelon",
      "Peach",
      "Pear",
      "Plum",
      "Kiwi",
      "Papaya",
      "Coconut",
      "Cherry",
      "Pomegranate",
      "Fig",
      "Grapefruit",
      "Cantaloupe",
    ],
  },
  {
    category: "Dairy & Eggs",
    items: [
      "Milk",
      "Butter",
      "Heavy Cream",
      "Sour Cream",
      "Greek Yogurt",
      "Cream Cheese",
      "Cheddar Cheese",
      "Mozzarella",
      "Parmesan",
      "Feta",
      "Brie",
      "Gouda",
      "Ricotta",
      "Cottage Cheese",
      "Mascarpone",
      "Half and Half",
    ],
  },
  {
    category: "Grains & Bread",
    items: [
      "White Rice",
      "Brown Rice",
      "Pasta",
      "Spaghetti",
      "Penne",
      "Bread",
      "Sourdough",
      "Flour Tortillas",
      "Corn Tortillas",
      "Oats",
      "Quinoa",
      "Barley",
      "Couscous",
      "Breadcrumbs",
      "Panko",
      "Pita Bread",
      "Naan",
      "All-Purpose Flour",
      "Whole Wheat Flour",
      "Cornmeal",
    ],
  },
  {
    category: "Oils & Condiments",
    items: [
      "Olive Oil",
      "Vegetable Oil",
      "Coconut Oil",
      "Sesame Oil",
      "Butter",
      "Soy Sauce",
      "Fish Sauce",
      "Worcestershire Sauce",
      "Hot Sauce",
      "Sriracha",
      "Ketchup",
      "Mustard",
      "Mayonnaise",
      "Dijon Mustard",
      "Hoisin Sauce",
      "Oyster Sauce",
      "Tahini",
      "Pesto",
      "Tomato Paste",
      "Tomato Sauce",
      "BBQ Sauce",
      "Teriyaki Sauce",
      "Balsamic Vinegar",
      "Apple Cider Vinegar",
      "White Wine Vinegar",
      "Rice Vinegar",
    ],
  },
  {
    category: "Spices & Herbs",
    items: [
      "Salt",
      "Black Pepper",
      "Cumin",
      "Paprika",
      "Smoked Paprika",
      "Turmeric",
      "Cinnamon",
      "Oregano",
      "Thyme",
      "Rosemary",
      "Basil",
      "Bay Leaves",
      "Chili Powder",
      "Cayenne Pepper",
      "Red Pepper Flakes",
      "Garlic Powder",
      "Onion Powder",
      "Ginger",
      "Nutmeg",
      "Cloves",
      "Cardamom",
      "Coriander",
      "Cumin Seeds",
      "Mustard Seeds",
      "Fennel Seeds",
      "Dill",
      "Parsley",
      "Cilantro",
      "Chives",
      "Sage",
      "Marjoram",
      "Allspice",
      "Star Anise",
      "Vanilla Extract",
      "Saffron",
      "Curry Powder",
      "Garam Masala",
      "Za'atar",
      "Sumac",
      "Harissa",
      "Ras el Hanout",
    ],
  },
  {
    category: "Pantry Staples",
    items: [
      "Sugar",
      "Brown Sugar",
      "Honey",
      "Maple Syrup",
      "Baking Powder",
      "Baking Soda",
      "Cornstarch",
      "Yeast",
      "Cocoa Powder",
      "Chocolate Chips",
      "Vanilla Extract",
      "Chicken Broth",
      "Vegetable Broth",
      "Beef Broth",
      "Coconut Milk",
      "Canned Tomatoes",
      "Canned Corn",
      "Canned Black Beans",
      "Canned Chickpeas",
      "Peanut Butter",
      "Almond Butter",
      "Jam",
      "Olive Tapenade",
      "Capers",
      "Sun-Dried Tomatoes",
    ],
  },
  {
    category: "Nuts & Seeds",
    items: [
      "Almonds",
      "Walnuts",
      "Cashews",
      "Pecans",
      "Pistachios",
      "Pine Nuts",
      "Pumpkin Seeds",
      "Sunflower Seeds",
      "Chia Seeds",
      "Flaxseeds",
      "Sesame Seeds",
      "Hemp Seeds",
      "Hazelnuts",
      "Macadamia Nuts",
      "Brazil Nuts",
    ],
  },
];

const UNIT_OPTIONS = [
  "unit",
  "lb",
  "oz",
  "g",
  "kg",
  "cup",
  "tbsp",
  "tsp",
  "bunch",
  "slice",
  "can",
  "jar",
  "bottle",
  "carton",
  "dozen",
  "ear",
  "bag",
];

const CATEGORY_LABELS: Record<string, string> = {
  protein: "Proteins",
  proteins: "Proteins",
  produce: "Produce",
  vegetable: "Vegetables",
  vegetables: "Vegetables",
  fruit: "Fruits",
  fruits: "Fruits",
  "dairy-eggs": "Dairy & Eggs",
  dairy: "Dairy & Eggs",
  grains: "Grains & Bread",
  grain: "Grains & Bread",
  pantry: "Pantry Staples",
  "pantry-staples": "Pantry Staples",
  condiments: "Oils & Condiments",
  "oils-condiments": "Oils & Condiments",
  spices: "Spices & Herbs",
  "spices-herbs": "Spices & Herbs",
  nuts: "Nuts & Seeds",
  "nuts-seeds": "Nuts & Seeds",
};

const DEFAULT_AMOUNT_BY_UNIT: Record<string, number> = {
  unit: 1,
  lb: 1,
  oz: 8,
  g: 500,
  kg: 1,
  cup: 1,
  tbsp: 1,
  tsp: 1,
  bunch: 1,
  slice: 4,
  can: 1,
  jar: 1,
  bottle: 1,
  carton: 1,
  dozen: 1,
  ear: 2,
  bag: 1,
};

function normalizeIngredientKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function catalogDefaultsFor(
  name: string,
  category: string,
): IngredientCatalogEntry {
  const key = normalizeIngredientKey(name);
  const lowerCategory = category.toLowerCase();
  let defaultUnit = "unit";

  if (
    /(beef|chicken|pork|turkey|lamb|salmon|tuna|shrimp|fish|cod|crab|lobster|scallop)/.test(
      key,
    )
  ) {
    defaultUnit = "lb";
  } else if (/(egg|eggs)/.test(key)) {
    defaultUnit = "dozen";
  } else if (/(milk|cream|yogurt|broth|stock|coconut milk)/.test(key)) {
    defaultUnit = "carton";
  } else if (
    /(cheese|butter|tofu|tempeh|bacon|nuts|seeds|almonds|walnuts|cashews|pecans|pistachios)/.test(
      key,
    )
  ) {
    defaultUnit = "oz";
  } else if (
    /(rice|pasta|oats|quinoa|barley|couscous|flour|cornmeal|sugar|lentils|chickpeas|beans)/.test(
      key,
    )
  ) {
    defaultUnit = "cup";
  } else if (/(bread|sourdough|tortilla|pita|naan)/.test(key)) {
    defaultUnit = "slice";
  } else if (
    /(cilantro|parsley|basil|chives|dill|rosemary|thyme|sage)/.test(key)
  ) {
    defaultUnit = "bunch";
  } else if (
    /(oil|sauce|vinegar|ketchup|mustard|mayonnaise|sriracha|honey|syrup)/.test(
      key,
    )
  ) {
    defaultUnit = "bottle";
  } else if (/(^| )corn($| )/.test(key)) {
    defaultUnit = "ear";
  } else if (/(paste|jam|butter|tapenade|capers|tomatoes)/.test(key)) {
    defaultUnit = "jar";
  } else if (
    lowerCategory.includes("spices") ||
    /(salt|pepper|cumin|paprika|turmeric|cinnamon|oregano|powder|seeds|extract|saffron|sumac|harissa)/.test(
      key,
    )
  ) {
    defaultUnit = "jar";
  }

  return {
    category,
    defaultUnit,
    defaultAmount: DEFAULT_AMOUNT_BY_UNIT[defaultUnit] ?? 1,
  };
}

const CATALOG_META = new Map<string, IngredientCatalogEntry>(
  INGREDIENT_CATALOG.flatMap((group) =>
    group.items.map((item) => [
      normalizeIngredientKey(item),
      catalogDefaultsFor(item, group.category),
    ]),
  ),
);

function inferCatalogMeta(name: string): IngredientCatalogEntry | undefined {
  const key = normalizeIngredientKey(name);
  const exact = CATALOG_META.get(key);
  if (exact) return exact;

  for (const [catalogName, meta] of CATALOG_META) {
    if (key.includes(catalogName) || catalogName.includes(key)) {
      return meta;
    }
  }

  return undefined;
}

function inferUnit(name: string, category?: string) {
  return (
    inferCatalogMeta(name)?.defaultUnit ??
    catalogDefaultsFor(name, category ?? "Pantry Staples").defaultUnit
  );
}

function inferAmount(name: string, unit: string) {
  return (
    inferCatalogMeta(name)?.defaultAmount ?? DEFAULT_AMOUNT_BY_UNIT[unit] ?? 1
  );
}

function inferCategoryFromName(name: string) {
  const key = normalizeIngredientKey(name);

  if (
    /(chicken|beef|pork|bacon|turkey|lamb|fish|sirloin|fillet|salmon|tuna|shrimp|crab|lobster|scallop|cod|tofu|tempeh|lentil|chickpea|bean|edamame)/.test(
      key,
    )
  ) {
    return "Proteins";
  }

  if (
    /(milk|cheese|egg|cream|yogurt|butter|mozzarella|parmesan|feta|brie|gouda|ricotta|mascarpone)/.test(
      key,
    )
  ) {
    return "Dairy & Eggs";
  }

  if (
    /(apple|banana|lemon|lime|orange|strawberry|blueberry|raspberry|mango|avocado|grape|pineapple|watermelon|peach|pear|plum|kiwi|papaya|coconut|cherry|pomegranate|fig|grapefruit|cantaloupe)/.test(
      key,
    )
  ) {
    return "Fruits";
  }

  if (
    /(onion|garlic|tomato|pepper|broccoli|spinach|kale|carrot|celery|cucumber|zucchini|eggplant|mushroom|asparagus|pea|corn|cauliflower|cabbage|lettuce|arugula|potato|beet|artichoke|leek|bok choy|radish|turnip|parsnip|aji|cilantro|parsley|basil|chive|dill)/.test(
      key,
    )
  ) {
    return "Vegetables";
  }

  if (
    /(rice|bread|fries|pasta|spaghetti|penne|tortilla|oat|quinoa|barley|couscous|breadcrumb|panko|pita|naan|flour|cornmeal)/.test(
      key,
    )
  ) {
    return "Grains & Bread";
  }

  if (
    /(oil|sauce|vinegar|paste|ketchup|mustard|mayonnaise|sriracha|tahini|pesto|broth|stock|canned|sugar|honey|syrup|baking|cornstarch|yeast|cocoa|chocolate|peanut butter|almond butter|jam|tapenade|caper|pecan|almond|walnut|cashew|pistachio|seed)/.test(
      key,
    )
  ) {
    return "Pantry Staples";
  }

  if (
    /(salt|pepper|cumin|paprika|turmeric|cinnamon|oregano|thyme|rosemary|bay|chili|cayenne|powder|ginger|nutmeg|clove|cardamom|coriander|fennel|sage|allspice|anise|vanilla|saffron|curry|masala|zaatar|sumac|harissa|ras el hanout)/.test(
      key,
    )
  ) {
    return "Spices & Herbs";
  }

  return undefined;
}

function displayCategoryFor(name: string, rawCategory?: string) {
  const catalogCategory = inferCatalogMeta(name)?.category;
  const normalizedCategory = rawCategory?.trim().toLowerCase();

  if (!normalizedCategory || normalizedCategory === "other") {
    return catalogCategory ?? inferCategoryFromName(name) ?? "Other";
  }

  return (
    CATEGORY_LABELS[normalizedCategory] ?? toTitleCase(rawCategory!.trim())
  );
}
type VisionMode = "photo" | "video" | "camera";

// ─── Ingredient image ─────────────────────────────────────────────────────────

function ingredientImageUrl(name: string) {
  const slug = name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(slug)}-Small.png`;
}

function IngredientImage({ name, size }: { name: string; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ingredientImageUrl(name)}
      alt={name}
      width={size}
      height={size}
      className="w-full h-full object-cover"
      onError={(e) => {
        const img = e.currentTarget;
        img.style.display = "none";
        const fallback = img.nextElementSibling as HTMLElement | null;
        if (fallback) fallback.style.display = "flex";
      }}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(str: string) {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function realToDisplay(item: KitchenInventoryItem): DisplayItem {
  const rawCategory = item.ingredient?.category?.trim();
  const name =
    item.display_name ||
    item.label ||
    item.ingredient?.canonical_name ||
    "Inventory item";
  const unit =
    item.unit ?? item.ingredient?.default_unit ?? inferUnit(name, rawCategory);
  const estimatedAmount = item.estimated_amount ?? inferAmount(name, unit);
  const amount = `${estimatedAmount} ${unit}`.trim();

  return {
    id: item.id,
    name,
    category: displayCategoryFor(name, rawCategory),
    quantity: amount,
    estimatedAmount,
    unit,
  };
}

// ─── Ingredient Picker Panel ──────────────────────────────────────────────────

function IngredientPicker({
  existingNames,
  onAdd,
  embedded = false,
}: {
  existingNames: Set<string>;
  onAdd: (
    name: string,
    options?: { estimatedAmount?: number; unit?: string },
  ) => void;
  embedded?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [amountByName, setAmountByName] = useState<Record<string, string>>({});
  const [unitByName, setUnitByName] = useState<Record<string, string>>({});

  const tabs = ["All", ...INGREDIENT_CATALOG.map((c) => c.category)];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return INGREDIENT_CATALOG.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (activeTab === "All" || group.category === activeTab) &&
          item.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [search, activeTab]);

  async function handleCheck(name: string) {
    if (existingNames.has(name.toLowerCase()) || adding.has(name)) return;
    const defaultUnit = inferUnit(name);
    const unit = unitByName[name]?.trim() || defaultUnit;
    const parsedAmount = Number(
      amountByName[name] ?? String(inferAmount(name, unit)),
    );
    const estimatedAmount =
      Number.isFinite(parsedAmount) && parsedAmount > 0
        ? parsedAmount
        : inferAmount(name, unit);
    setAdding((prev) => new Set(prev).add(name));
    await onAdd(name, { estimatedAmount, unit });
    setAdding((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }

  return (
    <div
      className={`bg-white overflow-hidden ${
        embedded
          ? "rounded-2xl border border-outline-variant/30"
          : "rounded-3xl border border-outline-variant/30 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-outline-variant/20">
        {!embedded && (
          <h3 className="font-bold text-on-surface text-base mb-3">
            Add Ingredients
          </h3>
        )}
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ingredients…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-outline-variant text-sm outline-none focus:border-primary transition-colors bg-surface-container-low"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline"
            >
              <span className="material-symbols-outlined text-[16px]">
                close
              </span>
            </button>
          )}
        </div>
        {/* Category tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-primary-fixed-dim text-on-primary-fixed"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div
        className={`overflow-y-auto divide-y divide-outline-variant/10 ${
          embedded ? "max-h-[58vh]" : "max-h-[480px]"
        }`}
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-outline text-center py-10">
            {`No results for "${search}"`}
          </p>
        ) : (
          filtered.map((group) => (
            <div key={group.category}>
              <div className="px-5 py-2 bg-surface-container-low/60 sticky top-0 z-10">
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                  {group.category}
                </span>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {group.items.map((name) => {
                  const inKitchen = existingNames.has(name.toLowerCase());
                  const isAdding = adding.has(name);
                  const selectedUnit =
                    unitByName[name] ?? inferUnit(name, group.category);
                  return (
                    <div
                      key={name}
                      className={`flex items-center gap-3 px-5 py-2.5 cursor-pointer transition-colors ${
                        inKitchen
                          ? "bg-primary-fixed-dim/10 cursor-default"
                          : "hover:bg-surface-container-low/50"
                      }`}
                    >
                      {/* Ingredient image */}
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface-container shrink-0 relative">
                        <IngredientImage name={name} size={32} />
                        <span
                          className="hidden absolute inset-0 items-center justify-center text-outline"
                          style={{ display: "none" }}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            nutrition
                          </span>
                        </span>
                      </div>
                      <span
                        className={`flex-1 text-sm font-medium truncate ${
                          inKitchen ? "text-on-surface/50" : "text-on-surface"
                        }`}
                      >
                        {name}
                      </span>
                      {!inKitchen && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={
                              amountByName[name] ??
                              String(inferAmount(name, selectedUnit))
                            }
                            onChange={(e) =>
                              setAmountByName((prev) => ({
                                ...prev,
                                [name]: e.target.value,
                              }))
                            }
                            placeholder="Qty"
                            className="w-20 px-2 py-1.5 rounded-lg border border-outline-variant bg-white text-xs outline-none focus:border-primary"
                          />
                          <select
                            value={selectedUnit}
                            onChange={(e) =>
                              setUnitByName((prev) => ({
                                ...prev,
                                [name]: e.target.value,
                              }))
                            }
                            className="w-20 px-2 py-1.5 rounded-lg border border-outline-variant bg-white text-xs outline-none focus:border-primary"
                            aria-label={`Unit for ${name}`}
                          >
                            {UNIT_OPTIONS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {/* Checkbox / state */}
                      {inKitchen ? (
                        <span className="material-symbols-outlined text-primary-fixed-dim text-[20px]">
                          check_circle
                        </span>
                      ) : isAdding ? (
                        <span className="material-symbols-outlined text-outline text-[18px] animate-spin">
                          refresh
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => handleCheck(name)}
                          className="w-4 h-4 accent-primary-fixed-dim cursor-pointer"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function IngredientPickerModal({
  existingNames,
  onAdd,
  onClose,
}: {
  existingNames: Set<string>;
  onAdd: (
    name: string,
    options?: { estimatedAmount?: number; unit?: string },
  ) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-4 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30">
          <div>
            <p className="font-bold text-on-surface">Add ingredients</p>
            <p className="text-xs text-outline">
              Choose what is in your kitchen
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          <IngredientPicker
            existingNames={existingNames}
            onAdd={onAdd}
            embedded
          />
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InventoryClient({
  realItems,
}: {
  realItems: KitchenInventoryItem[];
}) {
  const [activeCategory, setActiveCategory] = useState("All Items");
  const [inventorySearch, setInventorySearch] = useState("");
  const [ingredientPickerOpen, setIngredientPickerOpen] = useState(false);
  const [visionMode, setVisionMode] = useState<VisionMode | null>(null);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [items, setItems] = useState<DisplayItem[]>(
    realItems.map(realToDisplay),
  );
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const [restockError, setRestockError] = useState<string | undefined>();
  const [isRestocking, startRestock] = useTransition();

  // Set of existing ingredient names (lowercase) for the picker
  const existingNames = useMemo(
    () => new Set(items.map((i) => i.name.toLowerCase())),
    [items],
  );

  // Derive category list from actual items
  const categories = [
    "All Items",
    ...Array.from(new Set(items.map((i) => i.category))).sort(),
  ];

  const normalizedInventorySearch = inventorySearch.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const matchesCategory =
      activeCategory === "All Items" || item.category === activeCategory;
    const matchesSearch =
      normalizedInventorySearch.length === 0 ||
      item.name.toLowerCase().includes(normalizedInventorySearch);

    return matchesCategory && matchesSearch;
  });

  // Group by category
  const grouped = filtered.reduce<Record<string, DisplayItem[]>>(
    (acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    },
    {},
  );

  async function handlePickerAdd(
    name: string,
    options?: { estimatedAmount?: number; unit?: string },
  ) {
    const result = await addInventoryItemAction(name, options);
    if (result.data) {
      setItems((prev) => [realToDisplay(result.data!), ...prev]);
    }
  }

  function handleAdded(item: KitchenInventoryItem) {
    setItems((prev) => [realToDisplay(item), ...prev]);
  }

  function handleRemove(id: string) {
    setRemovingId(id);
    const remove = async () => {
      await removeInventoryItemAction(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setRemovingId(null);
    };
    remove();
  }

  async function handleQuantitySave(
    item: DisplayItem,
    overrides: { unit?: string } = {},
  ) {
    const rawAmount =
      amountDrafts[item.id] ?? String(item.estimatedAmount ?? "");
    const parsedAmount = Number(rawAmount);
    const estimatedAmount =
      rawAmount.trim() && Number.isFinite(parsedAmount) && parsedAmount >= 0
        ? parsedAmount
        : null;
    const unit =
      (overrides.unit ?? unitDrafts[item.id] ?? item.unit ?? "").trim() || null;

    setSavingId(item.id);
    const result = await updateInventoryItemAction(item.id, {
      estimatedAmount,
      unit,
    });

    if (result.data) {
      const next = realToDisplay(result.data);
      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? next : entry)),
      );
      setAmountDrafts((prev) => ({
        ...prev,
        [item.id]: String(next.estimatedAmount ?? ""),
      }));
      setUnitDrafts((prev) => ({ ...prev, [item.id]: next.unit ?? "" }));
    }

    setSavingId(null);
  }

  function handleAddToCart() {
    if (items.length === 0) return;
    setRestockError(undefined);
    startRestock(async () => {
      const names = items.map((i) => i.name);
      const result = await createRestockCartAction(names);
      if (result?.error) setRestockError(result.error);
    });
  }

  return (
    <>
      <AppShell topBarTitle="Inventory">
        <div className="px-4 py-6 max-w-6xl mx-auto space-y-6">
          {/* ── Hero + Quick Restock ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Hero banner */}
            <div className="lg:col-span-7 relative rounded-3xl overflow-hidden min-h-44 p-6 flex flex-col justify-between">
              <Image
                src="/images/tomato.png"
                alt=""
                fill
                className="object-cover"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative z-10">
                <h2 className="text-white font-bold text-2xl leading-tight">
                  Your Kitchen
                </h2>
                <p className="text-white/70 text-sm mt-1 max-w-xs leading-5">
                  Track what you have at home and generate a shopping cart for
                  anything you need.
                </p>
              </div>
              <div className="relative z-10 flex gap-3 mt-4 flex-wrap">
                <button
                  onClick={() => setVisionMode("camera")}
                  className="flex items-center gap-2 bg-white text-[#1a1c1a] font-semibold text-sm px-4 py-2.5 rounded-full shadow hover:bg-white/90 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    center_focus_strong
                  </span>
                  Live scan
                </button>
                <button
                  onClick={() => setVisionMode("photo")}
                  className="flex items-center gap-2 bg-white/15 text-white font-semibold text-sm px-4 py-2.5 rounded-full border border-white/30 hover:bg-white/25 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    add_a_photo
                  </span>
                  Photo
                </button>
                <button
                  onClick={() => setVisionMode("video")}
                  className="flex items-center gap-2 bg-white/15 text-white font-semibold text-sm px-4 py-2.5 rounded-full border border-white/30 hover:bg-white/25 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    video_camera_back
                  </span>
                  Video
                </button>
                <button
                  onClick={() => setBarcodeOpen(true)}
                  className="flex items-center gap-2 bg-white/15 text-white font-semibold text-sm px-4 py-2.5 rounded-full border border-white/30 hover:bg-white/25 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    barcode_scanner
                  </span>
                  Barcode
                </button>
                <button
                  onClick={() => setIngredientPickerOpen(true)}
                  aria-expanded={ingredientPickerOpen}
                  className={`flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-full border transition-colors ${
                    ingredientPickerOpen
                      ? "bg-white text-[#1a1c1a] border-white shadow hover:bg-white/90"
                      : "bg-white/15 text-white border-white/30 hover:bg-white/25"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    add
                  </span>
                  Add
                </button>
              </div>
            </div>

            {/* Quick Restock card */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-outline-variant/30 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-on-surface">Quick Restock</span>
                <span className="bg-primary-fixed-dim text-on-primary-fixed text-[11px] font-bold px-2.5 py-1 rounded-full">
                  {items.length} ITEMS
                </span>
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-outline flex-1 flex items-center">
                  Add ingredients to get started.
                </p>
              ) : (
                <div className="space-y-3 flex-1">
                  {items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-surface-container shrink-0 relative">
                          <IngredientImage name={item.name} size={28} />
                          <span
                            className="hidden absolute inset-0 items-center justify-center text-xs text-outline"
                            style={{ display: "none" }}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              nutrition
                            </span>
                          </span>
                        </div>
                        <span className="text-sm font-medium text-on-surface truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-xs font-medium ml-2 shrink-0 text-outline">
                        {item.quantity}
                      </span>
                    </div>
                  ))}
                  {items.length > 4 && (
                    <p className="text-xs text-outline">
                      +{items.length - 4} more
                    </p>
                  )}
                </div>
              )}

              {restockError && (
                <p className="text-xs text-red-500 mt-2">{restockError}</p>
              )}
              <button
                onClick={handleAddToCart}
                disabled={isRestocking || items.length === 0}
                className="mt-4 w-full bg-on-surface text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-on-surface/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isRestocking ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      refresh
                    </span>
                    Building cart…
                  </>
                ) : (
                  "Add All to Cart"
                )}
              </button>
            </div>
          </div>

          {/* ── Category filters ── */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search inventory..."
                className="w-full pl-9 pr-9 py-1.5 rounded-full border border-outline-variant text-sm outline-none focus:border-primary transition-colors bg-surface-container"
              />
              {inventorySearch && (
                <button
                  type="button"
                  onClick={() => setInventorySearch("")}
                  aria-label="Clear inventory search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    close
                  </span>
                </button>
              )}
            </div>
            {items.length > 0 &&
              categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-primary-fixed-dim text-on-primary-fixed"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {cat}
                </button>
              ))}
          </div>

          {/* ── Item groups ── */}
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-10 text-outline">
              <span className="material-symbols-outlined text-[48px] block mb-3 opacity-40">
                inventory_2
              </span>
              <p className="text-sm">
                {items.length === 0
                  ? "No items yet — use Add to choose ingredients."
                  : `No in-stock ingredients found for "${inventorySearch.trim()}".`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([category, groupItems]) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-outline">
                      {category}
                    </span>
                    <span className="text-[11px] text-outline">
                      {groupItems.length}{" "}
                      {groupItems.length === 1 ? "ITEM" : "ITEMS"}
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-outline-variant/30 overflow-hidden divide-y divide-outline-variant/20 shadow-sm">
                    {groupItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-opacity ${
                          removingId === item.id ? "opacity-40" : ""
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-surface-container-low shrink-0 relative">
                          <IngredientImage name={item.name} size={40} />
                          <span
                            className="hidden absolute inset-0 items-center justify-center text-outline"
                            style={{ display: "none" }}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              nutrition
                            </span>
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-on-surface truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-outline">
                            {item.category}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={
                                amountDrafts[item.id] ??
                                String(item.estimatedAmount ?? "")
                              }
                              onChange={(e) =>
                                setAmountDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              onBlur={() => void handleQuantitySave(item)}
                              placeholder="Qty"
                              className="w-20 px-2 py-1.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-semibold outline-none focus:border-primary"
                            />
                            <select
                              value={unitDrafts[item.id] ?? item.unit ?? ""}
                              onChange={(e) => {
                                const nextUnit = e.target.value;
                                setUnitDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: nextUnit,
                                }));
                                void handleQuantitySave(item, {
                                  unit: nextUnit,
                                });
                              }}
                              className="w-20 px-2 py-1.5 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-semibold outline-none focus:border-primary"
                              aria-label={`Unit for ${item.name}`}
                            >
                              {UNIT_OPTIONS.map((unit) => (
                                <option key={unit} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                            {savingId === item.id && (
                              <span className="material-symbols-outlined text-outline text-[16px] animate-spin">
                                refresh
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemove(item.id)}
                            className="p-1 rounded-full text-outline hover:text-error hover:bg-error-container/30 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>

      {/* Modals */}
      {visionMode && (
        <VisionScanModal
          mode={visionMode}
          onClose={() => setVisionMode(null)}
          onAdded={handleAdded}
        />
      )}
      {barcodeOpen && (
        <CameraModal
          mode="scan"
          onClose={() => setBarcodeOpen(false)}
          onAdded={handleAdded}
        />
      )}
      {ingredientPickerOpen && (
        <IngredientPickerModal
          existingNames={existingNames}
          onAdd={handlePickerAdd}
          onClose={() => setIngredientPickerOpen(false)}
        />
      )}
    </>
  );
}
