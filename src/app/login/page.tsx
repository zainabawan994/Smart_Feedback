import Link from "next/link";
import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { login } from "@/lib/actions";
import { ActionForm, AuthCard, Field } from "@/components/forms";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await sessionUser();
  if (user) redirect(user.emailVerified ? "/admin" : "/verify");
  const { next = "/admin" } = await searchParams;
  return (
    <AuthCard
      eyebrow="Owner desk · Log in"
      title="Welcome back."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-ink underline underline-offset-4">
            Set up your business
          </Link>
        </>
      }
    >
      <ActionForm action={login} submit="Log in">
        <input type="hidden" name="next" value={next} />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <Link href="/forgot" className="-mt-2 justify-self-end text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink">
          Forgot password?
        </Link>
      </ActionForm>
    </AuthCard>
  );
}
