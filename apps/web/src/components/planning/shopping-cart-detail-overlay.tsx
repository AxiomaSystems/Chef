"use client";

import type { MatchedIngredientProduct, ProductCandidate, ShoppingCart } from "@cart/shared";
import { useMemo, useState, useTransition } from "react";
import { searchRetailerProductsAction, updateShoppingCartAction } from "@/app/home-actions";

function fmt$(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}
function subtotal(items: MatchedIngredientProduct[]) {
  return Number(items.reduce((s, i) => s + (i.estimated_line_total ?? 0), 0).toFixed(2));
}
function buildReplaced(cur: MatchedIngredientProduct, cand: ProductCandidate, query: string): MatchedIngredientProduct {
  return { ...cur, kind: cur.kind ?? "ingredient_match", walmart_search_query: query.trim() || cur.walmart_search_query, selected_product: cand, selected_quantity: 1, estimated_line_total: Number(cand.price.toFixed(2)), notes: cur.kind === "manual_item" ? cur.notes : "Replaced manually" };
}
function buildManual(cand: ProductCandidate, query: string): MatchedIngredientProduct {
  const label = query.trim() || cand.title;
  return { kind: "manual_item", canonical_ingredient: label, manual_label: label, needed_amount: 1, needed_unit: "unit", walmart_search_query: label, selected_product: cand, selected_quantity: 1, estimated_line_total: Number(cand.price.toFixed(2)), notes: "Added manually" };
}

type SearchCtx = { mode: "replace"; index: number; query: string } | { mode: "add"; query: string };

export function ShoppingCartDetailOverlay({ shoppingCart, onClose }: { shoppingCart: ShoppingCart | null; onClose: () => void }) {
  const [cart, setCart] = useState<ShoppingCart | null>(shoppingCart);
  const [editing, setEditing] = useState(false);
  const [ctx, setCtx] = useState<SearchCtx | null>(null);
  const [results, setResults] = useState<ProductCandidate[]>([]);
  const [searchErr, setSearchErr] = useState<string | undefined>();
  const [saveErr, setSaveErr] = useState<string | undefined>();
  const [isSearching, startSearch] = useTransition();
  const [isSaving, startSave] = useTransition();

  const total = useMemo(() => cart ? subtotal(cart.matched_items) : 0, [cart]);

  if (!cart) return null;

  const lineCount = cart.matched_items.length;
  const updatedAt = (cart as any).updated_at ?? cart.created_at ?? new Date().toISOString();

  function replaceItem(i: number) {
    const item = cart!.matched_items[i];
    setCtx({ mode: "replace", index: i, query: item.walmart_search_query || item.manual_label || item.canonical_ingredient });
    setResults([]); setSearchErr(undefined);
  }
  function deleteLine(i: number) {
    const next = cart!.matched_items.filter((_, idx) => idx !== i);
    setCart({ ...cart!, matched_items: next, estimated_subtotal: subtotal(next) });
  }
  function adjustQty(i: number, delta: number) {
    const next = cart!.matched_items.map((item, idx) => {
      if (idx !== i || !item.selected_product) return item;
      const qty = Math.max(1, (item.selected_quantity ?? 1) + delta);
      return { ...item, selected_quantity: qty, estimated_line_total: Number((item.selected_product.price * qty).toFixed(2)) };
    });
    setCart({ ...cart!, matched_items: next, estimated_subtotal: subtotal(next) });
  }
  function selectCandidate(cand: ProductCandidate) {
    if (!ctx || !cart) return;
    const next = ctx.mode === "replace"
      ? cart.matched_items.map((item, i) => i === ctx.index ? buildReplaced(item, cand, ctx.query) : item)
      : [...cart.matched_items, buildManual(cand, ctx.query)];
    setCart({ ...cart, matched_items: next, estimated_subtotal: subtotal(next) });
    setCtx(null); setResults([]); setSearchErr(undefined);
  }
  function search() {
    if (!ctx || !cart) return;
    setSearchErr(undefined);
    startSearch(async () => {
      const res = await searchRetailerProductsAction(cart.retailer, ctx.query);
      if (res.error) { setSearchErr(res.error); return; }
      setResults(res.results ?? []);
    });
  }
  function saveChanges() {
    if (!cart?.id) { setSaveErr("Cart not found."); return; }
    setSaveErr(undefined);
    startSave(async () => {
      const res = await updateShoppingCartAction(cart.id ?? "", cart.matched_items);
      if (res.error || !res.shoppingCart) { setSaveErr(res.error ?? "Update failed."); return; }
      setCart(res.shoppingCart); setEditing(false); setCtx(null); setResults([]);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-[#1a1c1a]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] bg-[#faf9f6] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#d7c2b9]/30 bg-[#FFFAF7] flex-shrink-0">
          <div>
            <p className="text-label-sm text-[#895032] uppercase tracking-wider">Shopping Cart</p>
            <h2 className="text-headline-sm text-[#1a1c1a] mt-1">
              {cart.retailer.charAt(0).toUpperCase() + cart.retailer.slice(1)}
            </h2>
            <p className="text-body-sm text-[#85736c] mt-0.5">{lineCount} items · updated {fmtDate(updatedAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setCart(shoppingCart); setCtx(null); setResults([]); }} className="px-4 py-2 rounded-full border border-[#d7c2b9] text-label-md text-[#52443d] hover:bg-[#f4f3f1] transition-colors">Cancel</button>
                <button onClick={saveChanges} disabled={isSaving} className="px-4 py-2 rounded-full bg-[#895032] text-white text-label-md hover:bg-[#7a4326] disabled:opacity-50 transition-colors">{isSaving ? "Saving…" : "Save Changes"}</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-full border border-[#d7c2b9] text-label-md text-[#52443d] hover:bg-[#f4f3f1] transition-colors">Edit Cart</button>
            )}
            <button onClick={onClose} className="w-10 h-10 rounded-full border border-[#d7c2b9] flex items-center justify-center hover:bg-[#f4f3f1] transition-colors">
              <span className="material-symbols-outlined text-[#52443d] text-[20px]">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row gap-6 p-6">

            {/* Items list */}
            <div className="flex-1 space-y-3">
              {saveErr && <div className="p-3 rounded-xl bg-[#ffdad6] text-[#93000a] text-body-sm">{saveErr}</div>}

              {cart.matched_items.map((item, i) => {
                const prod = item.selected_product;
                const label = item.kind === "manual_item" ? (item.manual_label ?? item.canonical_ingredient) : item.canonical_ingredient;
                return (
                  <div key={`${item.canonical_ingredient}-${i}`} className={`bg-white rounded-xl border p-4 ${item.kind === "manual_item" ? "border-[#fcb1b8]/50" : "border-[#d7c2b9]/30"} shadow-sm`}>
                    <div className="flex items-start gap-4">
                      {/* Product image */}
                      <div className="w-16 h-16 rounded-lg bg-[#efeeeb] overflow-hidden flex-shrink-0">
                        {prod?.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={prod.image_url} alt={prod.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#d7c2b9]">grocery</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-label-lg text-[#1a1c1a]">{prod?.title ?? label}</p>
                            {prod?.brand && <p className="text-label-sm text-[#85736c] mt-0.5">{prod.brand}</p>}
                            {!prod && (
                              <p className="text-label-sm text-[#884d54] mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">info</span>
                                No match yet
                              </p>
                            )}
                          </div>
                          {item.estimated_line_total !== undefined && (
                            <p className="text-label-lg text-[#895032] shrink-0">{fmt$(item.estimated_line_total)}</p>
                          )}
                        </div>

                        {/* Qty controls + actions */}
                        <div className="flex items-center gap-3 mt-3">
                          {editing && prod && (
                            <div className="flex items-center gap-2">
                              <button onClick={() => adjustQty(i, -1)} className="w-7 h-7 rounded-full border border-[#d7c2b9] flex items-center justify-center hover:bg-[#f4f3f1] text-[#52443d] font-bold transition-colors">−</button>
                              <span className="text-label-md text-[#1a1c1a] w-5 text-center">{item.selected_quantity ?? 1}</span>
                              <button onClick={() => adjustQty(i, 1)} className="w-7 h-7 rounded-full border border-[#d7c2b9] flex items-center justify-center hover:bg-[#f4f3f1] text-[#52443d] font-bold transition-colors">+</button>
                            </div>
                          )}
                          {editing && (
                            <>
                              <button onClick={() => replaceItem(i)} className="text-label-sm text-[#895032] hover:underline">Replace</button>
                              <button onClick={() => deleteLine(i)} className="text-label-sm text-[#884d54] hover:underline">Delete</button>
                            </>
                          )}
                          {item.kind === "manual_item" && (
                            <span className="text-label-sm text-[#884d54] bg-[#fcb1b8]/30 px-2 py-0.5 rounded-full">Manual</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {editing && (
                <button onClick={() => { setCtx({ mode: "add", query: "" }); setResults([]); }} className="w-full py-3 rounded-xl border-2 border-dashed border-[#d7c2b9] text-label-lg text-[#85736c] hover:border-[#895032] hover:text-[#895032] flex items-center justify-center gap-2 transition-colors">
                  <span className="material-symbols-outlined">add</span>
                  Add item manually
                </button>
              )}
            </div>

            {/* Sidebar: summary + search */}
            <div className="lg:w-72 space-y-4 flex-shrink-0">
              {/* Order summary */}
              <div className="bg-white rounded-2xl border border-[#d7c2b9]/30 p-5 shadow-sm">
                <h3 className="text-label-lg text-[#895032] mb-4">Order Summary</h3>
                <div className="space-y-2 pb-4 border-b border-[#d7c2b9]/20">
                  <div className="flex justify-between text-body-sm text-[#52443d]">
                    <span>Subtotal ({lineCount} items)</span>
                    <span>{fmt$(total)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-headline-sm text-[#1a1c1a]">Total</span>
                  <span className="text-headline-sm text-[#895032]">{fmt$(total)}</span>
                </div>
              </div>

              {/* Product search panel */}
              {ctx && (
                <div className="bg-white rounded-2xl border border-[#d7c2b9]/30 p-5 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-label-lg text-[#1a1c1a]">{ctx.mode === "replace" ? "Replace item" : "Add item"}</h4>
                    <p className="text-body-sm text-[#85736c] mt-0.5">Search {cart.retailer} products</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ctx.query}
                      onChange={(e) => setCtx({ ...ctx, query: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && search()}
                      placeholder="e.g. basmati rice"
                      className="flex-1 bg-[#f4f3f1] border border-[#d7c2b9]/50 rounded-xl px-3 py-2 text-body-sm text-[#1a1c1a] focus:outline-none focus:ring-2 focus:ring-[#895032]/30"
                    />
                    <button onClick={search} disabled={isSearching} className="px-3 py-2 bg-[#895032] text-white rounded-xl text-label-sm hover:bg-[#7a4326] disabled:opacity-50 transition-colors">
                      {isSearching ? "…" : "Search"}
                    </button>
                  </div>
                  {searchErr && <p className="text-body-sm text-[#ba1a1a]">{searchErr}</p>}
                  {results.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {results.map((c) => (
                        <div key={c.product_id} className="flex items-center gap-3 p-3 rounded-xl bg-[#f4f3f1] hover:bg-[#efe3b3]/40 transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-[#efeeeb] overflow-hidden flex-shrink-0">
                            {c.image_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-label-md text-[#1a1c1a] truncate">{c.title}</p>
                            <p className="text-label-sm text-[#895032]">{fmt$(c.price)}</p>
                          </div>
                          <button onClick={() => selectCandidate(c)} className="text-label-sm text-[#895032] border border-[#895032] px-2 py-1 rounded-full hover:bg-[#ffb38e]/20 transition-colors">Pick</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { setCtx(null); setResults([]); }} className="text-body-sm text-[#85736c] hover:text-[#52443d]">Cancel</button>
                </div>
              )}

              {/* Ingredient overview toggle */}
              <details className="bg-white rounded-2xl border border-[#d7c2b9]/30 shadow-sm overflow-hidden">
                <summary className="p-5 cursor-pointer text-label-lg text-[#52443d] flex items-center justify-between select-none">
                  <span>Ingredient Overview</span>
                  <span className="text-label-md text-[#895032]">{cart.overview.length} items</span>
                </summary>
                <div className="px-5 pb-5 space-y-2 border-t border-[#d7c2b9]/20 pt-3">
                  {cart.overview.map((ing) => (
                    <div key={`${ing.canonical_ingredient}-${ing.unit}`} className="flex justify-between text-body-sm">
                      <span className="text-[#1a1c1a]">{ing.canonical_ingredient}</span>
                      <span className="text-[#85736c]">{ing.total_amount} {ing.unit}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
