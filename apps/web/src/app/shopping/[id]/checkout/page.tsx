import { redirect } from "next/navigation";

export default async function ShoppingCartCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/shopping/checkout/${id}`);
}
