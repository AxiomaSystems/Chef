import type {
  BaseRecipe,
  Cart,
  User,
} from "@cart/shared";
import { redirect } from "next/navigation";
import {
  fetchAuthedCollection,
  fetchAuthedResource,
  fetchCollection,
} from "@/lib/api";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { HomeWorkspace } from "@/components/dashboard/home-workspace";
import type { DashboardCartDraft } from "@/components/dashboard/drafts-and-carts-section";
import { buildPlanningItems } from "@/components/dashboard/recent-work.utils";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function Home() {
  const recipesPromise = fetchCollection<BaseRecipe>("/recipes");
  const mePromise = fetchAuthedResource<User>("/me");
  const draftsPromise =
    fetchAuthedCollection<DashboardCartDraft>("/cart-drafts");
  const cartsPromise = fetchAuthedCollection<Cart>("/carts");

  const [recipes, me, drafts, carts] = await Promise.all([
    recipesPromise,
    mePromise,
    draftsPromise,
    cartsPromise,
  ]);

  if (!me.data) {
    redirect("/login");
  }

  if (!me.data.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const latestDraft = drafts.data
    .toSorted(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
    )[0];
  const latestCart = carts.data
    .toSorted(
      (left, right) =>
        new Date(
          right.updated_at ?? right.created_at ?? new Date().toISOString(),
        ).getTime() -
        new Date(
          left.updated_at ?? left.created_at ?? new Date().toISOString(),
        ).getTime(),
    )[0];
  const planningItems = buildPlanningItems(drafts.data, carts.data);
  const latestPlanningItem =
    latestDraft &&
    (!latestCart ||
      new Date(latestDraft.updated_at).getTime() >=
        new Date(
          latestCart.updated_at ?? latestCart.created_at ?? new Date().toISOString(),
        ).getTime())
      ? {
          kind: "draft" as const,
          title: latestDraft.name ?? "Untitled draft",
          updatedAtLabel: formatDate(latestDraft.updated_at),
          selectionsCount: latestDraft.selections.length,
          retailer: latestDraft.retailer,
        }
      : latestCart
        ? {
            kind: "cart" as const,
            title: latestCart.name ?? "Unnamed cart",
            updatedAtLabel: formatDate(
              latestCart.updated_at ??
                latestCart.created_at ??
                new Date().toISOString(),
            ),
            selectionsCount: latestCart.selections.length,
            dishesCount: latestCart.dishes.length,
          }
        : null;
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <DashboardHeader user={me.data} activeSection="home" />
        <HomeWorkspace
          activePlanningState={latestPlanningItem}
          planningItems={planningItems}
          drafts={drafts.data}
          carts={carts.data}
          recipes={recipes.data.toSorted(
            (left, right) =>
              new Date(right.updated_at).getTime() -
              new Date(left.updated_at).getTime(),
          )}
        />
      </div>
    </main>
  );
}
