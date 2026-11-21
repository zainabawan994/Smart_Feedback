import Link from "next/link";
import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { signup } from "@/lib/actions";
import { ActionForm, AuthCard, Field, PlaceFields, PlanNote } from "@/components/forms";
import { asPlan, planLabel } from "@/lib/options";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const plan = asPlan((await searchParams).plan);
  const user = await sessionUser();
  if (user) redirect(!user.emailVerified ? "/verify" : plan ? `/admin/plan?plan=${plan}` : "/admin");
  return (
    <AuthCard
      eyebrow="Owner desk · Step 1 of 2"
      title="Set up your business."
      footer={
        <>
          Have an account?{" "}
          <Link href={plan ? `/login?plan=${plan}` : "/login"} className="text-ink underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      {plan && <PlanNote label={planLabel(plan)} />}
      <ActionForm action={signup} submit="Create my desk">
        {plan && <input type="hidden" name="plan" value={plan} />}
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" hint="8+ characters" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <Field label="Repeat password" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        <div className="dashed my-1" />
        <PlaceFields />
      </ActionForm>
    </AuthCard>
  );
}
