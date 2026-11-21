import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resendReset, resetPassword } from "@/lib/actions";
import { maskEmail } from "@/lib/mask";
import { ActionForm, AuthCard, CodeInput, Field, ResendButton } from "@/components/forms";

export default async function ResetPage() {
  const email = (await cookies()).get("sf_reset_email")?.value;
  if (!email) redirect("/forgot");
  return (
    <AuthCard
      eyebrow="Owner desk · New password"
      title="Enter the code."
      footer={
        <Link href="/forgot" className="text-ink underline underline-offset-4">
          Use a different email
        </Link>
      }
    >
      <p className="-mt-3 mb-5 text-sm text-muted">
        If <span className="font-medium text-ink">{maskEmail(email)}</span> has an account, a 6-digit code is on its way. It expires in 10 minutes.
      </p>
      <ActionForm action={resetPassword} submit="Save new password">
        <CodeInput />
        <Field label="New password" hint="8+ characters" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <Field label="Repeat new password" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </ActionForm>
      <div className="mt-5">
        <ResendButton action={resendReset} />
      </div>
      <p className="mt-4 text-xs text-muted">Saving a new password signs you out on every other device.</p>
    </AuthCard>
  );
}
