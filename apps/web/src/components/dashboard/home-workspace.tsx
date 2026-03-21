"use client";

import { useCallback, useState } from "react";
import type { BaseRecipe } from "@cart/shared";
import { DashboardActionPanel } from "./dashboard-action-panel";
import { NewDraftOverlay } from "./new-draft-overlay";
import { RecentWorkSection } from "./recent-work-section";
import type { PlanningItem } from "./recent-work.utils";
import type { DashboardCartDraft } from "./drafts-and-carts-section";
import type { Cart } from "@cart/shared";
import { PlanningDetailOverlay } from "@/components/planning/planning-detail-overlay";

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
  const [activeDetail, setActiveDetail] = useState<
    | { type: "draft"; id: string }
    | { type: "cart"; id: string }
    | null
  >(null);

  const openDraftOverlay = useCallback(() => {
    setOverlayVersion((current) => current + 1);
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
          }
        : null;

  return (
    <>
      <DashboardActionPanel
        activePlanningState={props.activePlanningState}
        onOpenDraft={openDraftOverlay}
      />

      <section className="grid gap-6">
        <RecentWorkSection
          planningItems={props.planningItems}
          onOpenDetail={openDetail}
        />
      </section>

      <NewDraftOverlay
        key={overlayVersion}
        open={isDraftOverlayOpen}
        recipes={props.recipes}
        onClose={closeDraftOverlay}
        onCreated={openDetail}
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
                }
              : null
        }
        onClose={closeDetail}
      />
    </>
  );
}
