import { redirect } from "next/navigation";

export default function ImportPage() {
  redirect("/recipes?import=1");
}
