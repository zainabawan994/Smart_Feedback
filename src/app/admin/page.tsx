import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { listBusinesses } from "@/lib/store";

// /admin → the owner's first business, or the add-business form if they have none yet.
export default async function AdminHome() {
  const user = await sessionUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) redirect("/verify");
  const [first] = await listBusinesses(user.id);
  redirect(first ? `/admin/${first.slug}` : "/admin/new");
}
