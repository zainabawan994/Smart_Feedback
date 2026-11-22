import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { login } from "@/lib/actions";
import { ActionForm, AuthCard, Field } from "@/components/forms";

// Main admin's own login screen. Owners use /login; the same login action sends each one to their own screen.
export default async function AdminLoginPage() {
  const user = await sessionUser();
  if (user) redirect(!user.emailVerified ? "/verify" : "/superadmin");
  return (
    <AuthCard eyebrow="SmartFeedback · Main admin" title="Admin log in." footer={<>Business owner? Use the owner log in on the home page.</>}>
      <ActionForm action={login} submit="Log in">
        <input type="hidden" name="next" value="/superadmin" />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      </ActionForm>
    </AuthCard>
  );
}
