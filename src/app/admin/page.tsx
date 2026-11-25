import { redirect } from "next/navigation";
import { isAdmin, sessionUser } from "@/lib/auth";
import { listBusinesses } from "@/lib/store";

// /admin → the owner's first business (or a "no business yet" notice); the main admin goes to /superadmin.
export default async function AdminHome() {
  const user = await sessionUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) redirect("/verify");
  if (await isAdmin(user)) redirect("/superadmin");
  const [first] = await listBusinesses(user.id);
  redirect(first ? `/admin/${first.slug}` : "/admin/new");
}
