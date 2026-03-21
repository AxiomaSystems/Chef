"use client";

import { useCallback, useState } from "react";
import type { BaseRecipe } from "@cart/shared";
import { DashboardActionPanel } from "./dashboard-action-panel";
import { NewDraftOverlay } from "./new-draft-overlay";
import { RecentWorkSection } from "./recent-work-section";
import type { PlanningItem } from "./recent-work.utils";

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
}) {
  const [isDraftOverlayOpen, setDraftOverlayOpen] = useState(false);
  const [overlayVersion, setOverlayVersion] = useState(0);

  const openDraftOverlay = useCallback(() => {
    setOverlayVersion((current) => current + 1);
    setDraftOverlayOpen(true);
  }, []);

  const closeDraftOverlay = useCallback(() => {
    setDraftOverlayOpen(false);
  }, []);

  return (
    <>
      <DashboardActionPanel
          activePlanningState={props.activePlanningState}
        onOpenDraft={openDraftOverlay}
      />

      <section className="grid gap-6">
        <RecentWorkSection planningItems={props.planningItems} />
      </section>

      <NewDraftOverlay
        key={overlayVersion}
        open={isDraftOverlayOpen}
        recipes={props.recipes}
        onClose={closeDraftOverlay}
      />
    </>
  );
}
