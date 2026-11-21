import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { listBusinesses } from "@/lib/store";
import { asPlan } from "@/lib/options";

// Pricing button → (log in) → here → the Plan & billing page of the owner's first business, with that plan preselected.
export default async function PlanRedirect({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const plan = asPlan((await searchParams).plan);
  const user = await sessionUser();
  if (!user) redirect(plan ? `/login?plan=${plan}` : "/login");
  if (!user.emailVerified) redirect("/verify");
  const [first] = await listBusinesses(user.id);
  if (!first) redirect("/admin/new");
  redirect(`/admin/${first.slug}/billing${plan ? `?plan=${plan}` : ""}`);
}
