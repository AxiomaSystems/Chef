"use client";

import { useCallback, useState } from "react";
import type { BaseRecipe, Cart, Retailer, ShoppingCart } from "@cart/shared";
import { DashboardActionPanel } from "./dashboard-action-panel";
import { NewDraftOverlay } from "./new-draft-overlay";
import { RecentWorkSection } from "./recent-work-section";
import type { PlanningItem } from "./recent-work.utils";
import type { DashboardCartDraft } from "./drafts-and-carts-section";
import { PlanningDetailOverlay } from "@/components/planning/planning-detail-overlay";
import { ShoppingCartDetailOverlay } from "@/components/planning/shopping-cart-detail-overlay";

type ActivePlanningState =
  | {
      kind: "draft";
      title: string;
      updatedAtLabel: string;
      selectionsCount: number;
      retailer: string;
    }
  | {
      kind: "cart";
      title: string;
      updatedAtLabel: string;
      selectionsCount: number;
      dishesCount: number;
    }
  | null;

export function HomeWorkspace(props: {
  activePlanningState: ActivePlanningState;
  planningItems: PlanningItem[];
  recipes: BaseRecipe[];
  drafts: DashboardCartDraft[];
  carts: Cart[];
}) {
  const [isDraftOverlayOpen, setDraftOverlayOpen] = useState(false);
  const [overlayVersion, setOverlayVersion] = useState(0);
  const [builderConfig, setBuilderConfig] = useState<{
    initialName?: string;
    initialSelections: Array<{ recipeId: string; quantity: number }>;
    initialRetailer?: Retailer;
    mode: "create" | "edit-draft" | "edit-cart";
    resourceId?: string;
  }>({
    initialSelections: [],
    mode: "create",
  });
  const [activeDetail, setActiveDetail] = useState<
    | { type: "draft"; id: string }
    | { type: "cart"; id: string }
    | null
  >(null);
  const [activeShoppingCart, setActiveShoppingCart] =
    useState<ShoppingCart | null>(null);

  const openDraftOverlay = useCallback(() => {
    setOverlayVersion((current) => current + 1);
    setBuilderConfig({
      initialSelections: [],
      mode: "create",
    });
    setDraftOverlayOpen(true);
  }, []);

  const closeDraftOverlay = useCallback(() => {
    setDraftOverlayOpen(false);
  }, []);

  const openDetail = useCallback((detail: { type: "draft" | "cart"; id: string }) => {
    setActiveDetail(detail);
  }, []);

  const closeDetail = useCallback(() => {
    setActiveDetail(null);
  }, []);

  const openShoppingCart = useCallback((shoppingCart: ShoppingCart) => {
    setActiveDetail(null);
    setActiveShoppingCart(shoppingCart);
  }, []);

  const closeShoppingCart = useCallback(() => {
    setActiveShoppingCart(null);
  }, []);

  const openEditorFromDetail = useCallback(
    (detail: {
      type: "draft" | "cart";
      id: string;
      name?: string;
      retailer: string;
      recipeSelections: Array<{ recipeId: string; quantity: number }>;
    }) => {
      closeDetail();
      setOverlayVersion((current) => current + 1);
      setBuilderConfig({
        initialName: detail.name,
        initialSelections: detail.recipeSelections,
        initialRetailer: detail.retailer as Retailer,
        mode: detail.type === "draft" ? "edit-draft" : "edit-cart",
        resourceId: detail.id,
      });
      setDraftOverlayOpen(true);
    },
    [closeDetail],
  );

  const activeDetailData =
    activeDetail?.type === "draft"
      ? {
          type: "draft" as const,
          draft: props.drafts.find((draft) => draft.id === activeDetail.id) ?? null,
          recipes: props.recipes,
        }
      : activeDetail?.type === "cart"
        ? {
            type: "cart" as const,
            cart: props.carts.find((cart) => cart.id === activeDetail.id) ?? null,
            recipes: props.recipes,
          }
        : null;

  return (
    <>
      <DashboardActionPanel
        activePlanningState={props.activePlanningState}
      />

      <section className="grid gap-6">
        <RecentWorkSection
          planningItems={props.planningItems}
          onOpenDetail={openDetail}
          onOpenDraft={openDraftOverlay}
        />
      </section>

      <NewDraftOverlay
        key={overlayVersion}
        open={isDraftOverlayOpen}
        recipes={props.recipes}
        onClose={closeDraftOverlay}
        onCreated={openDetail}
        initialName={builderConfig.initialName}
        initialSelections={builderConfig.initialSelections}
        initialRetailer={builderConfig.initialRetailer}
        mode={builderConfig.mode}
        resourceId={builderConfig.resourceId}
      />

      <PlanningDetailOverlay
        detail={
          activeDetailData?.type === "draft" && activeDetailData.draft
            ? {
                type: "draft",
                draft: activeDetailData.draft,
                recipes: activeDetailData.recipes,
              }
            : activeDetailData?.type === "cart" && activeDetailData.cart
              ? {
                  type: "cart",
                  cart: activeDetailData.cart,
                  recipes: activeDetailData.recipes,
                }
              : null
        }
        onClose={closeDetail}
        onEdit={openEditorFromDetail}
        onDeleted={closeDetail}
        onOpenShoppingCart={openShoppingCart}
      />

      <ShoppingCartDetailOverlay
        key={
          activeShoppingCart
            ? `${activeShoppingCart.id ?? "shopping-cart"}:${activeShoppingCart.updated_at ?? activeShoppingCart.created_at ?? "open"}`
            : "shopping-cart-none"
        }
        shoppingCart={activeShoppingCart}
        onClose={closeShoppingCart}
      />
    </>
  );
}
