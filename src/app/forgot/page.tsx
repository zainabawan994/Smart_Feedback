import Link from "next/link";
import { forgotPassword } from "@/lib/actions";
import { ActionForm, AuthCard, Field } from "@/components/forms";

export default function ForgotPage() {
  return (
    <AuthCard
      eyebrow="Owner desk · Forgot password"
      title="Reset your password."
      footer={
        <Link href="/login" className="text-ink underline underline-offset-4">
          ← Back to log in
        </Link>
      }
    >
      <p className="-mt-3 mb-5 text-sm text-muted">Enter the email you signed up with. We&apos;ll send a 6-digit code.</p>
      <ActionForm action={forgotPassword} submit="Send code">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
      </ActionForm>
    </AuthCard>
  );
}
