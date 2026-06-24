"use client";

import { useState, useTransition } from "react";
import { addInventoryItemAction } from "./actions";
import type { KitchenInventoryItem } from "@cart/shared";

export function AddItemModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (item: KitchenInventoryItem) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(undefined);
    startTransition(async () => {
      const result = await addInventoryItemAction(trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) onAdded(result.data);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
      <div
        className="bg-white rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-xl text-[#132326]">Add ingredient</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-outline">
              close
            </span>
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-on-surface-variant">
            Ingredient name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g. chicken breast, olive oil, spinach..."
            className="w-full border border-outline-variant rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
            autoFocus
          />
          <p className="text-xs text-outline">
            Type any ingredient — we&apos;ll add it to your kitchen.
          </p>
        </div>

        {error && (
          <p className="text-sm text-error bg-error-container/30 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={isPending || !name.trim()}
            className="flex-1 bg-primary-fixed-dim text-on-primary-fixed font-semibold py-3 rounded-2xl text-sm disabled:opacity-50 hover:bg-primary-fixed transition-colors"
          >
            {isPending ? "Adding…" : "Add to kitchen"}
          </button>
        </div>
      </div>
    </div>
  );
}
