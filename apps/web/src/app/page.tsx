import type {
  BaseRecipe,
  Cart,
  User,
  UserPreferences,
  UserStats,
  ShoppingCartHistorySummary,
} from "@cart/shared";
import { redirect } from "next/navigation";
import { logoutAction } from "./actions";
import {
  fetchAuthedCollection,
  fetchAuthedResource,
  fetchCollection,
} from "@/lib/api";
import { DashboardActionPanel } from "@/components/dashboard/dashboard-action-panel";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardStatsStrip } from "@/components/dashboard/dashboard-stats-strip";
import type { DashboardCartDraft } from "@/components/dashboard/drafts-and-carts-section";
import {
  buildPlanningItems,
  RecentWorkSection,
} from "@/components/dashboard/recent-work-section";
import { QuickAccessPanel } from "@/components/dashboard/quick-access-panel";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default async function Home() {
  const recipesPromise = fetchCollection<BaseRecipe>("/recipes");
  const mePromise = fetchAuthedResource<User>("/me");
  const statsPromise = fetchAuthedResource<UserStats>("/me/stats");
  const preferencesPromise =
    fetchAuthedResource<UserPreferences>("/me/preferences");
  const draftsPromise =
    fetchAuthedCollection<DashboardCartDraft>("/cart-drafts");
  const cartsPromise = fetchAuthedCollection<Cart>("/carts");
  const shoppingHistoryPromise =
    fetchAuthedCollection<ShoppingCartHistorySummary>(
      "/shopping-carts/history",
    );

  const [recipes, me, stats, preferences, drafts, carts, shoppingHistory] =
    await Promise.all([
    recipesPromise,
    mePromise,
    statsPromise,
    preferencesPromise,
    draftsPromise,
    cartsPromise,
    shoppingHistoryPromise,
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
  const latestShopping = shoppingHistory.data
    .toSorted(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
    )[0];
  const safeStats =
    stats.data ?? {
      owned_recipe_count: 0,
      cart_draft_count: 0,
      cart_count: 0,
      shopping_cart_count: 0,
      preferred_cuisine_count: 0,
      preferred_tag_count: 0,
    };
  const safePreferences =
    preferences.data ?? {
      preferred_cuisine_ids: [],
      preferred_cuisines: [],
      preferred_tag_ids: [],
      preferred_tags: [],
    };
  const suggestedRecipes = recipes.data
    .filter((recipe) => {
      const matchesCuisine = safePreferences.preferred_cuisine_ids.includes(
        recipe.cuisine_id,
      );
      const matchesTag = recipe.tag_ids.some((tagId) =>
        safePreferences.preferred_tag_ids.includes(tagId),
      );

      return matchesCuisine || matchesTag;
    })
    .slice(0, 3);

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <DashboardHeader
          user={me.data}
          logoutAction={logoutAction}
        />

        <DashboardActionPanel
          activePlanningState={latestPlanningItem}
          latestShoppingLabel={
            latestShopping
              ? `${latestShopping.retailer} · ${formatDate(latestShopping.updated_at)}`
              : undefined
          }
          latestShoppingSubtotal={
            latestShopping
              ? formatMoney(latestShopping.estimated_subtotal)
              : undefined
          }
          preferredCuisineCount={safeStats.preferred_cuisine_count}
          preferredTagCount={safeStats.preferred_tag_count}
        />

        <DashboardStatsStrip stats={safeStats} />

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <RecentWorkSection
            planningItems={planningItems}
            recipes={recipes.data
              .toSorted(
                (left, right) =>
                  new Date(right.updated_at).getTime() -
                  new Date(left.updated_at).getTime(),
              )
              .slice(0, 4)}
            formatDate={formatDate}
          />
          <QuickAccessPanel
            preferences={safePreferences}
            suggestedRecipes={suggestedRecipes}
            latestShopping={latestShopping}
            formatDate={formatDate}
            formatMoney={formatMoney}
          />
        </section>
      </div>
    </main>
  );
}
