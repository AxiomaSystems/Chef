"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type SetStateAction,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  displayIngredientCategory,
  inferInventoryAmount,
  inferInventoryUnit,
  INVENTORY_UNIT_OPTIONS,
  type KitchenInventoryItem,
} from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { routeMemoryKey, usePageMemory } from "@/lib/page-memory";
import { IngredientImage } from "./ingredient-image";
import { ModalPortal } from "./modal-portal";
import {
  removeInventoryItemAction,
  addInventoryItemAction,
  updateInventoryItemAction,
} from "./actions";

const CameraModal = dynamic(
  () => import("./camera-modal").then((mod) => mod.CameraModal),
  {
    loading: () => null,
    ssr: false,
  },
);

const IngredientPickerModal = dynamic(
  () =>
    import("./ingredient-picker-modal").then(
      (mod) => mod.IngredientPickerModal,
    ),
  {
    loading: () => null,
    ssr: false,
  },
);

const VoiceInventoryModal = dynamic(
  () =>
    import("./voice-inventory-modal").then((mod) => mod.VoiceInventoryModal),
  {
    loading: () => null,
    ssr: false,
  },
);

// Component ────────────────────────────────────────────────────────────────

type DisplayItem = {
  id: string;
  name: string;
  category: string;
  quantity: string;
  estimatedAmount?: number;
  unit?: string;
};

type InventoryPageMemory = {
  activeCategory: string;
  inventorySearch: string;
  categoryFiltersExpanded: boolean;
  detailItemId: string | null;
  scrollY: number;
};

const INVENTORY_MEMORY_DEFAULT: InventoryPageMemory = {
  activeCategory: "All Items",
  inventorySearch: "",
  categoryFiltersExpanded: false,
  detailItemId: null,
  scrollY: 0,
};

function realToDisplay(item: KitchenInventoryItem): DisplayItem {
  const rawCategory = item.ingredient?.category?.trim();
  const name =
    item.display_name ||
    item.label ||
    item.ingredient?.canonical_name ||
    "Inventory item";
  const unit =
    item.unit ?? item.ingredient?.default_unit ?? inferInventoryUnit(name);
  const estimatedAmount = item.estimated_amount ?? inferInventoryAmount(unit);
  const amount = `${estimatedAmount} ${unit}`.trim();

  return {
    id: item.id,
    name,
    category: displayIngredientCategory(name, rawCategory),
    quantity: amount,
    estimatedAmount,
    unit,
  };
}

function formatInventoryDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function InventoryClient({
  realItems,
  embedded = false,
  onItemsChange,
}: {
  realItems: KitchenInventoryItem[];
  embedded?: boolean;
  onItemsChange?: (items: KitchenInventoryItem[]) => void;
}) {
  const [ingredientPickerOpen, setIngredientPickerOpen] = useState(false);
  const [voiceInventoryOpen, setVoiceInventoryOpen] = useState(false);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [inventoryItems, setInventoryItems] =
    useState<KitchenInventoryItem[]>(realItems);
  const [items, setItems] = useState<DisplayItem[]>(
    realItems.map(realToDisplay),
  );
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const resetInventoryOverlays = useCallback(() => {
    setIngredientPickerOpen(false);
    setVoiceInventoryOpen(false);
    setBarcodeOpen(false);
    setAmountDrafts({});
    setUnitDrafts({});
  }, []);
  const [pageMemory, setPageMemory] = usePageMemory<InventoryPageMemory>(
    routeMemoryKey(embedded ? "/onboarding/inventory" : "/inventory"),
    INVENTORY_MEMORY_DEFAULT,
    {
      onReset: resetInventoryOverlays,
      restoreScrollKey: "scrollY",
      routeHref: embedded ? "/onboarding/inventory" : "/inventory",
    },
  );

  function setInventoryMemoryValue<K extends keyof InventoryPageMemory>(
    key: K,
    value: SetStateAction<InventoryPageMemory[K]>,
  ) {
    setPageMemory((current) => ({
      ...current,
      [key]:
        typeof value === "function"
          ? (
              value as (
                currentValue: InventoryPageMemory[K],
              ) => InventoryPageMemory[K]
            )(current[key])
          : value,
    }));
  }

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
  const activeCategory = categories.includes(pageMemory.activeCategory)
    ? pageMemory.activeCategory
    : "All Items";
  const inventorySearch = pageMemory.inventorySearch;
  const categoryFiltersExpanded = pageMemory.categoryFiltersExpanded;
  const detailItemId = pageMemory.detailItemId;

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
  const detailItem = useMemo(
    () => inventoryItems.find((item) => item.id === detailItemId),
    [detailItemId, inventoryItems],
  );
  const detailDisplay = detailItem ? realToDisplay(detailItem) : null;
  const inventoryOverlayOpen =
    barcodeOpen || ingredientPickerOpen || voiceInventoryOpen || !!detailItemId;

  useEffect(() => {
    onItemsChange?.(inventoryItems);
  }, [inventoryItems, onItemsChange]);

  async function handlePickerAdd(
    name: string,
    options?: { estimatedAmount?: number; unit?: string },
  ) {
    const result = await addInventoryItemAction(name, options);
    if (result.data) {
      setInventoryItems((prev) => [result.data!, ...prev]);
      setItems((prev) => [realToDisplay(result.data!), ...prev]);
    }
  }

  function handleAdded(item: KitchenInventoryItem) {
    setInventoryItems((prev) => [item, ...prev]);
    setItems((prev) => [realToDisplay(item), ...prev]);
  }

  function handleVoiceSaved(savedItems: KitchenInventoryItem[]) {
    setInventoryItems((prev) => {
      const byId = new Map(prev.map((item) => [item.id, item]));
      for (const item of savedItems) {
        byId.set(item.id, item);
      }
      return Array.from(byId.values()).sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at),
      );
    });
    setItems((prev) => {
      const byId = new Map(prev.map((item) => [item.id, item]));
      for (const item of savedItems) {
        byId.set(item.id, realToDisplay(item));
      }
      return Array.from(byId.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    });
  }

  function handleRemove(id: string) {
    setRemovingId(id);
    const remove = async () => {
      await removeInventoryItemAction(id);
      setInventoryItems((prev) => prev.filter((i) => i.id !== id));
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
      setInventoryItems((prev) =>
        prev.map((entry) =>
          entry.id === result.data!.id ? result.data! : entry,
        ),
      );
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

  return (
    <>
      <AppShell
        topBarTitle="Inventory"
        embedded={embedded}
        hideBottomCreateButton={inventoryOverlayOpen}
      >
        <div
          className={
            embedded
              ? "mx-auto max-w-6xl space-y-6 px-0 pb-32 pt-0 sm:px-4"
              : "px-4 py-6 max-w-6xl mx-auto space-y-6"
          }
        >
          {/* Hero */}
          <div className="relative rounded-3xl overflow-hidden min-h-44 p-6 flex flex-col justify-between">
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
                Track what you have at home and keep your kitchen inventory up
                to date.
              </p>
            </div>
            <div className="relative z-10 flex gap-3 mt-4 flex-wrap">
              <button
                onClick={() => setVoiceInventoryOpen(true)}
                aria-expanded={voiceInventoryOpen}
                className="flex items-center gap-2 bg-white text-[#132326] font-semibold text-sm px-4 py-2.5 rounded-full shadow hover:bg-white/90 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  mic
                </span>
                Voice Add
              </button>
              <button
                onClick={() => setIngredientPickerOpen(true)}
                aria-expanded={ingredientPickerOpen}
                className={`flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-full border transition-colors ${
                  ingredientPickerOpen
                    ? "bg-white text-[#132326] border-white shadow hover:bg-white/90"
                    : "bg-white/15 text-white border-white/30 hover:bg-white/25"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  add
                </span>
                Add
              </button>
              <button
                onClick={() => setBarcodeOpen(true)}
                aria-expanded={barcodeOpen}
                className={`flex items-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-full border transition-colors ${
                  barcodeOpen
                    ? "bg-white text-[#132326] border-white shadow hover:bg-white/90"
                    : "bg-white/15 text-white border-white/30 hover:bg-white/25"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  barcode_scanner
                </span>
                Barcode
              </button>
            </div>
          </div>

          {/* ── Category filters ── */}
          <div className="space-y-2">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                search
              </span>
              <input
                value={inventorySearch}
                onChange={(e) =>
                  setInventoryMemoryValue("inventorySearch", e.target.value)
                }
                placeholder="Search inventory..."
                className="w-full pl-9 pr-9 py-1.5 rounded-full border border-outline-variant text-sm outline-none focus:border-primary transition-colors bg-surface-container"
              />
              {inventorySearch && (
                <button
                  type="button"
                  onClick={() => setInventoryMemoryValue("inventorySearch", "")}
                  aria-label="Clear inventory search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    close
                  </span>
                </button>
              )}
            </div>
            {items.length > 0 && (
              <div className="flex items-start gap-2">
                <div
                  className={`flex flex-1 flex-wrap gap-2 overflow-hidden transition-[max-height] duration-200 ${
                    categoryFiltersExpanded ? "max-h-40" : "max-h-8"
                  }`}
                >
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setInventoryMemoryValue("activeCategory", cat)
                      }
                      className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        activeCategory === cat
                          ? "bg-primary-fixed-dim text-on-primary-fixed"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setInventoryMemoryValue(
                      "categoryFiltersExpanded",
                      (expanded) => !expanded,
                    )
                  }
                  aria-label={
                    categoryFiltersExpanded
                      ? "Collapse category filters"
                      : "Expand category filters"
                  }
                  aria-expanded={categoryFiltersExpanded}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {categoryFiltersExpanded ? "expand_less" : "expand_more"}
                  </span>
                </button>
              </div>
            )}
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
                        className={`flex min-w-0 items-center gap-2 px-4 py-3 transition-opacity sm:gap-3 ${
                          removingId === item.id ? "opacity-40" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setInventoryMemoryValue("detailItemId", item.id)
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          aria-label={`View details for ${item.name}`}
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

                          <span
                            className="min-w-0 flex-1 truncate text-sm font-semibold text-on-surface"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                        </button>

                        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
                          <div className="flex items-center gap-1 sm:gap-1.5">
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
                              className="w-12 rounded-lg border border-outline-variant bg-surface-container-low px-1.5 py-1.5 text-xs font-semibold outline-none focus:border-primary sm:w-14"
                              aria-label={`Quantity for ${item.name}`}
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
                              className="w-14 rounded-lg border border-outline-variant bg-surface-container-low px-1.5 py-1.5 text-xs font-semibold outline-none focus:border-primary sm:w-16"
                              aria-label={`Unit for ${item.name}`}
                            >
                              {INVENTORY_UNIT_OPTIONS.map((unit) => (
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

      {detailItem && detailDisplay ? (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
            <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant/30 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-surface-container-low">
                    <IngredientImage name={detailDisplay.name} size={48} />
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
                      Inventory item
                    </p>
                    <h3 className="mt-1 break-words text-lg font-bold leading-tight text-on-surface">
                      {detailDisplay.name}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInventoryMemoryValue("detailItemId", null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-container text-outline"
                  aria-label="Close inventory item details"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    close
                  </span>
                </button>
              </div>

              <div className="space-y-3 px-5 py-4">
                <div className="grid grid-cols-[1fr_1fr] gap-3">
                  <label className="block rounded-2xl bg-surface-container-low px-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-outline">
                      Quantity
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={
                        amountDrafts[detailDisplay.id] ??
                        String(detailDisplay.estimatedAmount ?? "")
                      }
                      onChange={(event) =>
                        setAmountDrafts((prev) => ({
                          ...prev,
                          [detailDisplay.id]: event.target.value,
                        }))
                      }
                      onBlur={() => void handleQuantitySave(detailDisplay)}
                      className="mt-2 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                      aria-label={`Quantity for ${detailDisplay.name}`}
                    />
                  </label>
                  <label className="block rounded-2xl bg-surface-container-low px-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-outline">
                      Unit
                    </span>
                    <select
                      value={
                        unitDrafts[detailDisplay.id] ?? detailDisplay.unit ?? ""
                      }
                      onChange={(event) => {
                        const nextUnit = event.target.value;
                        setUnitDrafts((prev) => ({
                          ...prev,
                          [detailDisplay.id]: nextUnit,
                        }));
                        void handleQuantitySave(detailDisplay, {
                          unit: nextUnit,
                        });
                      }}
                      className="mt-2 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                      aria-label={`Unit for ${detailDisplay.name}`}
                    >
                      {INVENTORY_UNIT_OPTIONS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {[
                  ["Display name", detailItem.display_name],
                  ["Category", detailDisplay.category],
                  [
                    "Canonical",
                    detailItem.ingredient?.canonical_name ?? "Not linked",
                  ],
                  ["Normalized", detailItem.normalized_name],
                  ["Brand / label", detailItem.label ?? "None"],
                  ["Ingredient ID", detailItem.ingredient_id ?? "Not linked"],
                  [
                    "Ingredient slug",
                    detailItem.ingredient?.slug ?? "Not linked",
                  ],
                  [
                    "Default unit",
                    detailItem.ingredient?.default_unit ?? "Not configured",
                  ],
                  ["Source", detailItem.source],
                  ["Confidence", detailItem.confidence],
                  ["Status", detailItem.review_status],
                  ["Created", formatInventoryDate(detailItem.created_at)],
                  ["Updated", formatInventoryDate(detailItem.updated_at)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 rounded-2xl bg-surface-container-low px-4 py-3"
                  >
                    <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-outline">
                      {label}
                    </span>
                    <span className="min-w-0 break-words text-right text-sm font-semibold text-on-surface">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {/* Modals */}
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
      {voiceInventoryOpen && (
        <VoiceInventoryModal
          currentItems={inventoryItems}
          onClose={() => setVoiceInventoryOpen(false)}
          onSaved={handleVoiceSaved}
        />
      )}
    </>
  );
}
