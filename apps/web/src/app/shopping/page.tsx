import type { ShoppingCart, User } from "@cart/shared";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ShoppingCartLibrary } from "@/components/shopping/shopping-cart-library";
import { fetchAuthedCollection, fetchAuthedResource } from "@/lib/api";

export default async function ShoppingPage() {
  const [me, shoppingCarts] = await Promise.all([
    fetchAuthedResource<User>("/me"),
    fetchAuthedCollection<ShoppingCart>("/shopping-carts"),
  ]);

  if (!me.data) {
    redirect("/login");
  }

  if (!me.data.onboarding_completed_at) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <DashboardHeader user={me.data} activeSection="shopping" />
        <ShoppingCartLibrary
          shoppingCarts={shoppingCarts.data.toSorted(
            (left, right) =>
              new Date(
                right.updated_at ?? right.created_at ?? new Date().toISOString(),
              ).getTime() -
              new Date(
                left.updated_at ?? left.created_at ?? new Date().toISOString(),
              ).getTime(),
          )}
        />
      </div>
    </main>
  );
}
