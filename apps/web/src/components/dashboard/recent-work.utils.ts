import type { Cart } from "@cart/shared";
import type { DashboardCartDraft } from "./drafts-and-carts-section";

export type PlanningItem =
  | {
      id: string;
      kind: "draft";
      title: string;
      subtitle: string;
      updatedAt: string;
    }
  | {
      id: string;
      kind: "cart";
      title: string;
      subtitle: string;
      updatedAt: string;
    };

export function buildPlanningItems(
  drafts: DashboardCartDraft[],
  carts: Cart[],
): PlanningItem[] {
  const normalizedDrafts: PlanningItem[] = drafts.map((draft) => ({
    id: draft.id,
    kind: "draft",
    title: draft.name ?? "Untitled draft",
    subtitle: `${draft.selections.length} selections - ${draft.retailer}`,
    updatedAt: draft.updated_at,
  }));

  const normalizedCarts: PlanningItem[] = carts.map((cart) => ({
    id: cart.id ?? `cart-${cart.updated_at ?? cart.created_at ?? "unknown"}`,
    kind: "cart",
    title: cart.name ?? "Unnamed cart",
    subtitle: `${cart.selections.length} selections - ${cart.dishes.length} dishes`,
    updatedAt: cart.updated_at ?? cart.created_at ?? new Date().toISOString(),
  }));

  return [...normalizedDrafts, ...normalizedCarts]
    .toSorted(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )
    .slice(0, 6);
}
