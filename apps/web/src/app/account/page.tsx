import type {
  Cuisine,
  Tag,
  User,
  UserPreferences,
  UserStats,
} from "@cart/shared";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { fetchAuthedResource, fetchCollection } from "@/lib/api";

export default async function AccountPage() {
  const [me, stats, preferences, cuisines, publicTags] = await Promise.all([
    fetchAuthedResource<User>("/me"),
    fetchAuthedResource<UserStats>("/me/stats"),
    fetchAuthedResource<UserPreferences>("/me/preferences"),
    fetchCollection<Cuisine>("/cuisines"),
    fetchCollection<Tag>("/tags"),
  ]);

  if (!me.data) {
    redirect("/login");
  }

  if (!me.data.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const safePreferences =
    preferences.data ?? {
      preferred_cuisine_ids: [],
      preferred_cuisines: [],
      preferred_tag_ids: [],
      preferred_tags: [],
    };

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <AccountShell
        user={me.data}
        stats={
          stats.data ?? {
            owned_recipe_count: 0,
            cart_draft_count: 0,
            cart_count: 0,
            shopping_cart_count: 0,
            preferred_cuisine_count: 0,
            preferred_tag_count: 0,
          }
        }
        preferences={safePreferences}
        cuisines={cuisines.data}
        systemTags={publicTags.data.filter((tag) => tag.scope === "system")}
      />
    </main>
  );
}
