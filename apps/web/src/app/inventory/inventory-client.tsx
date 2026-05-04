"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import type { KitchenInventoryItem } from "@cart/shared";
import { AppShell } from "@/components/layout/app-shell";
import { CameraModal } from "./camera-modal";
import { AddItemModal } from "./add-item-modal";
import { VisionScanModal } from "./vision-scan-modal";
import { removeInventoryItemAction, createRestockCartAction } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type DisplayItem = {
  id: string;
  name: string;
  category: string;
  quantity: string;
};

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
  const amount =
    item.estimated_amount != null
      ? `${item.estimated_amount}${item.unit ?? ""}`
      : "In stock";
  const rawCategory = item.ingredient.category?.trim();
  return {
    id: item.id,
    name: item.label ?? item.ingredient.canonical_name,
    category: rawCategory ? toTitleCase(rawCategory) : "Other",
    quantity: amount,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InventoryClient({
  realItems,
}: {
  realItems: KitchenInventoryItem[];
}) {
  const [activeCategory, setActiveCategory] = useState("All Items");
  const [visionMode, setVisionMode] = useState<VisionMode | null>(null);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [items, setItems] = useState<DisplayItem[]>(realItems.map(realToDisplay));
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [restockError, setRestockError] = useState<string | undefined>();
  const [isRestocking, startRestock] = useTransition();
  const [, startRemove] = useTransition();

  // Derive category list from actual items
  const categories = [
    "All Items",
    ...Array.from(new Set(items.map((i) => i.category))).sort(),
  ];

  const filtered =
    activeCategory === "All Items"
      ? items
      : items.filter((i) => i.category === activeCategory);

  // Group by category
  const grouped = filtered.reduce<Record<string, DisplayItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  function handleAdded(item: KitchenInventoryItem) {
    setItems((prev) => [realToDisplay(item), ...prev]);
  }

  function handleRemove(id: string) {
    setRemovingId(id);
    startRemove(async () => {
      await removeInventoryItemAction(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setRemovingId(null);
    });
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
                  Track what you have at home and generate a shopping cart for anything you need.
                </p>
              </div>
              <div className="relative z-10 flex gap-3 mt-4 flex-wrap">
                <button
                  onClick={() => setVisionMode("camera")}
                  className="flex items-center gap-2 bg-white text-[#1a1c1a] font-semibold text-sm px-4 py-2.5 rounded-full shadow hover:bg-white/90 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
                  Live scan
                </button>
                <button
                  onClick={() => setVisionMode("photo")}
                  className="flex items-center gap-2 bg-white/15 text-white font-semibold text-sm px-4 py-2.5 rounded-full border border-white/30 hover:bg-white/25 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                  Photo
                </button>
                <button
                  onClick={() => setVisionMode("video")}
                  className="flex items-center gap-2 bg-white/15 text-white font-semibold text-sm px-4 py-2.5 rounded-full border border-white/30 hover:bg-white/25 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">video_camera_back</span>
                  Video
                </button>
                <button
                  onClick={() => setBarcodeOpen(true)}
                  className="flex items-center gap-2 bg-white/15 text-white font-semibold text-sm px-4 py-2.5 rounded-full border border-white/30 hover:bg-white/25 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
                  Barcode
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
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-surface-container shrink-0 relative">
                          <IngredientImage name={item.name} size={28} />
                          <span
                            className="hidden absolute inset-0 items-center justify-center text-xs text-outline"
                            style={{ display: "none" }}
                          >
                            <span className="material-symbols-outlined text-[14px]">nutrition</span>
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
                    <p className="text-xs text-outline">+{items.length - 4} more</p>
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
                    <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                    Building cart…
                  </>
                ) : (
                  "Add All to Cart"
                )}
              </button>
            </div>
          </div>

          {/* ── Category filters ── */}
          {items.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
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
          )}

          {/* ── Item groups ── */}
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-16 text-outline">
              <span className="material-symbols-outlined text-[48px] block mb-3 opacity-40">
                inventory_2
              </span>
              <p className="text-sm">No items yet.</p>
              <button
                onClick={() => setAddItemOpen(true)}
                className="mt-4 text-primary-fixed-dim text-sm font-semibold underline underline-offset-2"
              >
                Add an ingredient
              </button>
            </div>
          ) : (
            <div className="space-y-6 pb-24 lg:pb-6">
              {Object.entries(grouped).map(([category, groupItems]) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-outline">
                      {category}
                    </span>
                    <span className="text-[11px] text-outline">
                      {groupItems.length} {groupItems.length === 1 ? "ITEM" : "ITEMS"}
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
                            <span className="material-symbols-outlined text-[20px]">nutrition</span>
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-on-surface truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-outline">{item.category}</p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-sm font-bold text-on-surface">
                            {item.quantity}
                          </span>
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

        {/* FAB */}
        <button
          onClick={() => setAddItemOpen(true)}
          className="fixed bottom-24 lg:bottom-8 right-6 bg-primary-fixed-dim text-on-primary-fixed w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-fixed transition-colors z-30"
          title="Add ingredient"
        >
          <span className="material-symbols-outlined text-[24px]">add</span>
        </button>
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
      {addItemOpen && (
        <AddItemModal
          onClose={() => setAddItemOpen(false)}
          onAdded={handleAdded}
        />
      )}
    </>
  );
}
