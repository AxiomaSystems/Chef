import { redirect } from "next/navigation";

export default async function LegacyNewRecipePage({
  searchParams,
}: {
  searchParams?: Promise<{ draft?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  redirect(
    resolvedSearchParams?.draft === "import"
      ? "/recipes/new?draft=import"
      : "/recipes/new",
  );
}
