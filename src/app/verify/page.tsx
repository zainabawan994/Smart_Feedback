import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { logout, resendVerification, verifyEmail } from "@/lib/actions";
import { maskEmail } from "@/lib/mask";
import { ActionForm, AuthCard, CodeInput, ResendButton } from "@/components/forms";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ unsent?: string }> }) {
  const { unsent } = await searchParams;
  const user = await sessionUser();
  if (!user) redirect("/login");
  if (user.emailVerified) redirect("/admin");
  return (
    <AuthCard
      eyebrow="Owner desk · Step 2 of 2"
      title="Check your email."
      footer={
        <form action={logout}>
          Wrong email?{" "}
          <button className="text-ink underline underline-offset-4">Log out and start again</button>
        </form>
      }
    >
      {unsent && (
        <p className="-mt-2 mb-4 rounded-lg border border-mustard px-3 py-2 text-sm" role="alert">
          We couldn&apos;t send the email just now. Tap <span className="font-medium">Send a new code</span> below to try again.
        </p>
      )}
      <p className="-mt-3 mb-5 text-sm text-muted">
        {unsent ? "Your code will go to" : "We sent a 6-digit code to"} <span className="font-medium text-ink">{maskEmail(user.email)}</span>. It expires in 10 minutes. Check spam if you don&apos;t see it.
      </p>
      <ActionForm action={verifyEmail} submit="Verify email">
        <CodeInput />
      </ActionForm>
      <div className="mt-5">
        <ResendButton action={resendVerification} />
      </div>
    </AuthCard>
  );
}
