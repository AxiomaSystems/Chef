import type {
  BaseRecipe,
  Cart,
  User,
  ShoppingCartHistorySummary,
} from "@cart/shared";
import { redirect } from "next/navigation";
import { logoutAction } from "./actions";
import {
  fetchAuthedCollection,
  fetchAuthedResource,
  fetchCollection,
} from "@/lib/api";
import { DraftsAndCartsSection } from "@/components/dashboard/drafts-and-carts-section";
import type { DashboardCartDraft } from "@/components/dashboard/drafts-and-carts-section";
import { HeroPanel } from "@/components/dashboard/hero-panel";
import { RecipesSection } from "@/components/dashboard/recipes-section";
import { ShoppingHistorySection } from "@/components/dashboard/shopping-history-section";

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
  const draftsPromise =
    fetchAuthedCollection<DashboardCartDraft>("/cart-drafts");
  const cartsPromise = fetchAuthedCollection<Cart>("/carts");
  const shoppingHistoryPromise =
    fetchAuthedCollection<ShoppingCartHistorySummary>(
      "/shopping-carts/history",
    );

  const [recipes, me, drafts, carts, shoppingHistory] = await Promise.all([
    recipesPromise,
    mePromise,
    draftsPromise,
    cartsPromise,
    shoppingHistoryPromise,
  ]);

  const totalSelections = drafts.data.reduce(
    (sum, draft) => sum + draft.selections.length,
    0,
  );

  if (!me.data) {
    redirect("/login");
  }

  if (!me.data.onboarding_completed_at) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <HeroPanel
          me={me.data}
          visibleRecipes={recipes.data.length}
          totalSelections={totalSelections}
          cartCount={carts.data.length}
          shoppingCartCount={shoppingHistory.data.length}
          logoutAction={logoutAction}
        />

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <RecipesSection recipes={recipes} />
          <DraftsAndCartsSection
            drafts={drafts}
            carts={carts}
            formatDate={formatDate}
          />
        </section>

        <ShoppingHistorySection
          shoppingHistory={shoppingHistory}
          formatDate={formatDate}
          formatMoney={formatMoney}
        />
      </div>
    </main>
  );
}
