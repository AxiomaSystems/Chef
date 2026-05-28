"use client";

import { useMemo, useState } from "react";
import {
  inferInventoryAmount,
  inferInventoryUnit,
  INVENTORY_UNIT_OPTIONS,
} from "@cart/shared";
import { IngredientImage } from "./ingredient-image";
import { ModalPortal } from "./modal-portal";

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

type AddInventoryOptions = { estimatedAmount?: number; unit?: string };

type IngredientPickerProps = {
  existingNames: Set<string>;
  onAdd: (name: string, options?: AddInventoryOptions) => Promise<void> | void;
  embedded?: boolean;
};

export type IngredientPickerModalProps = {
  existingNames: Set<string>;
  onAdd: (name: string, options?: AddInventoryOptions) => Promise<void> | void;
  onClose: () => void;
};

function IngredientPicker({
  existingNames,
  onAdd,
  embedded = false,
}: IngredientPickerProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [amountByName, setAmountByName] = useState<Record<string, string>>({});
  const [unitByName, setUnitByName] = useState<Record<string, string>>({});
  const [detailItem, setDetailItem] = useState<{
    name: string;
    category: string;
  } | null>(null);
  const trimmedSearch = search.trim();
  const normalizedSearch = trimmedSearch.toLowerCase();

  const tabs = [
    "All",
    ...INGREDIENT_CATALOG.map((category) => category.category),
  ];

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return INGREDIENT_CATALOG.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (activeTab === "All" || group.category === activeTab) &&
          item.toLowerCase().includes(query),
      ),
    })).filter((group) => group.items.length > 0);
  }, [search, activeTab]);
  const catalogHasSearchMatch =
    normalizedSearch.length > 0 &&
    INGREDIENT_CATALOG.some((group) =>
      group.items.some((item) => item.toLowerCase().includes(normalizedSearch)),
    );
  const canAddCustomItem =
    normalizedSearch.length > 0 &&
    !catalogHasSearchMatch &&
    !existingNames.has(normalizedSearch);
  const isAddingCustomItem = adding.has(trimmedSearch);
  const detailUnit = detailItem
    ? (unitByName[detailItem.name] ?? inferInventoryUnit(detailItem.name))
    : "unit";
  const detailAmount = detailItem
    ? (amountByName[detailItem.name] ??
      String(inferInventoryAmount(detailUnit)))
    : "";
  const detailInKitchen = detailItem
    ? existingNames.has(detailItem.name.toLowerCase())
    : false;
  const detailIsAdding = detailItem ? adding.has(detailItem.name) : false;

  async function handleCheck(name: string) {
    if (existingNames.has(name.toLowerCase()) || adding.has(name)) return;

    const defaultUnit = inferInventoryUnit(name);
    const unit = unitByName[name]?.trim() || defaultUnit;
    const parsedAmount = Number(
      amountByName[name] ?? String(inferInventoryAmount(unit)),
    );
    const estimatedAmount =
      Number.isFinite(parsedAmount) && parsedAmount > 0
        ? parsedAmount
        : inferInventoryAmount(unit);

    setAdding((previous) => new Set(previous).add(name));
    await onAdd(name, { estimatedAmount, unit });
    setAdding((previous) => {
      const next = new Set(previous);
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
      <div className="px-5 pt-5 pb-4 border-b border-outline-variant/20">
        {!embedded && (
          <h3 className="font-bold text-on-surface text-base mb-3">
            Add Ingredients
          </h3>
        )}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
            search
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ingredients..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-outline-variant text-sm outline-none focus:border-primary transition-colors bg-surface-container-low"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline"
              aria-label="Clear ingredient search"
            >
              <span className="material-symbols-outlined text-[16px]">
                close
              </span>
            </button>
          )}
        </div>
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

      <div
        className={`overflow-y-auto divide-y divide-outline-variant/10 ${
          embedded ? "max-h-[58vh]" : "max-h-[480px]"
        }`}
      >
        {filtered.length === 0 ? (
          <div className="py-10 px-5 text-center">
            <p className="text-sm text-outline">{`No results for "${search}"`}</p>
            {canAddCustomItem && (
              <button
                type="button"
                onClick={() => handleCheck(trimmedSearch)}
                disabled={isAddingCustomItem}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-fixed-dim px-4 py-2 text-sm font-semibold text-on-primary-fixed transition-colors hover:bg-primary-fixed disabled:opacity-60"
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    isAddingCustomItem ? "animate-spin" : ""
                  }`}
                >
                  {isAddingCustomItem ? "refresh" : "add"}
                </span>
                {isAddingCustomItem ? "Adding..." : "Add item"}
              </button>
            )}
            {normalizedSearch.length > 0 &&
              existingNames.has(normalizedSearch) && (
                <p className="mt-2 text-xs text-outline">
                  Already in your kitchen.
                </p>
              )}
          </div>
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
                    unitByName[name] ?? inferInventoryUnit(name);

                  return (
                    <div
                      key={name}
                      className={`flex min-w-0 items-center gap-2 px-5 py-2.5 cursor-pointer transition-colors sm:gap-3 ${
                        inKitchen
                          ? "bg-primary-fixed-dim/10 cursor-default"
                          : "hover:bg-surface-container-low/50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setDetailItem({ name, category: group.category })
                        }
                        className="flex min-w-0 flex-1 items-center gap-2 text-left sm:gap-3"
                        aria-label={`View details for ${name}`}
                      >
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
                          className={`min-w-0 flex-1 truncate text-sm font-medium ${
                            inKitchen ? "text-on-surface/50" : "text-on-surface"
                          }`}
                          title={name}
                        >
                          {name}
                        </span>
                      </button>
                      {!inKitchen && (
                        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={
                              amountByName[name] ??
                              String(inferInventoryAmount(selectedUnit))
                            }
                            onChange={(event) =>
                              setAmountByName((previous) => ({
                                ...previous,
                                [name]: event.target.value,
                              }))
                            }
                            placeholder="Qty"
                            className="w-12 rounded-lg border border-outline-variant bg-white px-1.5 py-1.5 text-xs outline-none focus:border-primary sm:w-14"
                            aria-label={`Quantity for ${name}`}
                          />
                          <select
                            value={selectedUnit}
                            onChange={(event) =>
                              setUnitByName((previous) => ({
                                ...previous,
                                [name]: event.target.value,
                              }))
                            }
                            className="w-14 rounded-lg border border-outline-variant bg-white px-1.5 py-1.5 text-xs outline-none focus:border-primary sm:w-16"
                            aria-label={`Unit for ${name}`}
                          >
                            {INVENTORY_UNIT_OPTIONS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
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

      {detailItem ? (
        <ModalPortal>
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant/30 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-surface-container-low">
                    <IngredientImage name={detailItem.name} size={48} />
                    <span
                      className="hidden h-full w-full items-center justify-center text-outline"
                      style={{ display: "none" }}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        nutrition
                      </span>
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      Manual add
                    </p>
                    <h3 className="mt-1 break-words text-lg font-bold leading-tight text-on-surface">
                      {detailItem.name}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-container text-outline"
                  aria-label="Close ingredient details"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    close
                  </span>
                </button>
              </div>

              <div className="space-y-3 px-5 py-4">
                <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-outline">
                    Category
                  </span>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {detailItem.category}
                  </p>
                </div>

                <div className="grid grid-cols-[1fr_1fr] gap-3">
                  <label className="block rounded-2xl bg-surface-container-low px-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-outline">
                      Quantity
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={detailAmount}
                      onChange={(event) =>
                        setAmountByName((previous) => ({
                          ...previous,
                          [detailItem.name]: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                    />
                  </label>
                  <label className="block rounded-2xl bg-surface-container-low px-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-outline">
                      Unit
                    </span>
                    <select
                      value={detailUnit}
                      onChange={(event) =>
                        setUnitByName((previous) => ({
                          ...previous,
                          [detailItem.name]: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                    >
                      {INVENTORY_UNIT_OPTIONS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-outline">
                    Status
                  </span>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {detailInKitchen
                      ? "Already in your kitchen"
                      : "Ready to add"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCheck(detailItem.name)}
                  disabled={detailInKitchen || detailIsAdding}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-fixed-dim px-4 py-3 text-sm font-bold text-on-primary-fixed transition-colors hover:bg-primary-fixed disabled:opacity-50"
                >
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      detailIsAdding ? "animate-spin" : ""
                    }`}
                  >
                    {detailIsAdding ? "refresh" : "add"}
                  </span>
                  {detailInKitchen
                    ? "Already added"
                    : detailIsAdding
                      ? "Adding..."
                      : "Add to inventory"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}

export function IngredientPickerModal({
  existingNames,
  onAdd,
  onClose,
}: IngredientPickerModalProps) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
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
    </ModalPortal>
  );
}
