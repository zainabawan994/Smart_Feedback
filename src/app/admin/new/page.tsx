import { redirect } from "next/navigation";
import { isAdmin, sessionUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { AuthCard } from "@/components/forms";

// Owners can't add businesses; the main admin does that from /superadmin/new.
export default async function NoBusinessPage() {
  const user = await sessionUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) redirect("/verify");
  if (await isAdmin(user)) redirect("/superadmin/new");
  return (
    <AuthCard
      eyebrow="Business owner"
      title="No business yet."
      footer={
        <form action={logout}>
          <button className="text-ink underline underline-offset-4">Log out</button>
        </form>
      }
    >
      <p className="text-muted">Your account has no business linked to it. Ask the SmartFeedback admin to add one for you.</p>
    </AuthCard>
  );
}
