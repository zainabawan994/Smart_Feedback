import Link from "next/link";
import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { login } from "@/lib/actions";
import { ActionForm, AuthCard, Field, PlanNote } from "@/components/forms";
import { asPlan, planLabel } from "@/lib/options";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; plan?: string }> }) {
  const { next = "/admin", plan: rawPlan } = await searchParams;
  const plan = asPlan(rawPlan);
  const user = await sessionUser();
  if (user) redirect(!user.emailVerified ? "/verify" : plan ? `/admin/plan?plan=${plan}` : "/admin");
  return (
    <AuthCard
      eyebrow="Business owner · Log in"
      title="Welcome back."
      footer={
<>No account? The SmartFeedback admin creates owner accounts.</>
      }
    >
      {plan && <PlanNote label={planLabel(plan)} />}
      <ActionForm action={login} submit="Log in">
        <input type="hidden" name="next" value={next} />
        {plan && <input type="hidden" name="plan" value={plan} />}
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <Link href="/forgot" className="-mt-2 justify-self-end text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink">
          Forgot password?
        </Link>
      </ActionForm>
    </AuthCard>
  );
}
