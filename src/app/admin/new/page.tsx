import Link from "next/link";
import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { addBusiness } from "@/lib/actions";
import { ActionForm, AuthCard, PlaceFields } from "@/components/forms";

export default async function NewBusinessPage() {
  const user = await sessionUser();
  if (!user) redirect("/login?next=/admin/new");
  if (!user.emailVerified) redirect("/verify");
  return (
    <AuthCard
      eyebrow="Owner desk · New location"
      title="Add a business."
      footer={
        <Link href="/admin" className="text-ink underline underline-offset-4">
          ← Back to my desk
        </Link>
      }
    >
      <ActionForm action={addBusiness} submit="Add business">
        <PlaceFields />
      </ActionForm>
    </AuthCard>
  );
}
