import { redirect } from "next/navigation";

export default async function LegacyCreatePage({
  searchParams,
}: {
  searchParams?: Promise<{ capture?: string; recipe?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  if (resolvedSearchParams?.recipe === "1") {
    redirect("/recipes/new");
  }

  if (resolvedSearchParams?.capture === "1") {
    redirect("/recipes?import=1");
  }

  redirect("/recipes");
}
