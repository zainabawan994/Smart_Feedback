import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { addBusiness } from "@/lib/actions";
import { ActionForm, AuthCard, Field, PlaceFields } from "@/components/forms";

export default async function NewBusinessPage() {
  await requireSuperAdmin();
  return (
    <AuthCard
      eyebrow="Main admin · New business"
      title="Add a business."
      footer={
        <Link href="/superadmin" className="text-ink underline underline-offset-4">
          ← Back to all businesses
        </Link>
      }
    >
      <ActionForm action={addBusiness} submit="Add business">
        <Field label="Owner email" name="ownerEmail" type="email" autoComplete="off" required />
        <Field label="Owner password" hint="only for a new owner · 8+ characters" name="password" type="password" autoComplete="new-password" minLength={8} />
        <div className="dashed my-1" />
        <PlaceFields />
      </ActionForm>
    </AuthCard>
  );
}
