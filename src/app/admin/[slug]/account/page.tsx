import Link from "next/link";
import { cookies } from "next/headers";
import { requireOwnerPage } from "@/lib/auth";
import { cancelEmailChange, changePassword, confirmEmailChange, logout, startEmailChange } from "@/lib/actions";
import { listBusinesses } from "@/lib/store";
import { maskEmail } from "@/lib/mask";
import { ActionForm, CodeInput, Field } from "@/components/forms";
import { PageHeader, card, eyebrow, page, when } from "../ui";

export default async function AccountPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ changed?: string }> }) {
  const { slug } = await params;
  const { changed } = await searchParams;
  const { user } = await requireOwnerPage(slug);
  const businesses = await listBusinesses(user.id);
  const pendingEmail = (await cookies()).get("sf_new_email")?.value;
  return (
    <div className={page}>
      <PageHeader eyebrow="Your account" title="Account">
        <Link href={`/admin/${slug}/billing`} className="text-sm underline decoration-line underline-offset-4 hover:decoration-ink">
          Plan &amp; billing →
        </Link>
      </PageHeader>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="font-display text-2xl">Login details</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className={eyebrow}>Email</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                {user.email}
                <span className="rounded-full bg-leaf px-2 py-0.5 text-xs text-paper">✓ verified</span>
              </dd>
            </div>
            <div>
              <dt className={eyebrow}>Member since</dt>
              <dd className="mt-1">{when(user.createdAt)}</dd>
            </div>
            <div>
              <dt className={eyebrow}>Businesses</dt>
              <dd className="mt-1">{businesses.map((b) => `${b.name} (${b.city})`).join(", ")}</dd>
            </div>
          </dl>
          <div className="dashed my-5" />
          <form action={logout}>
            <button className="rounded-full border border-ink px-5 py-2.5 text-sm transition hover:bg-ink hover:text-paper">Log out</button>
          </form>
        </section>

        <section className={card}>
          <h2 className="font-display text-2xl">Change password</h2>
          <p className="mb-5 mt-1 text-sm text-muted">You&apos;ll stay logged in here. Every other device gets signed out.</p>
          <ActionForm action={changePassword} submit="Change password">
            <Field label="Current password" name="current" type="password" autoComplete="current-password" required />
            <Field label="New password" hint="8+ characters" name="password" type="password" autoComplete="new-password" minLength={8} required />
            <Field label="Repeat new password" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </ActionForm>
        </section>

        <section className={card}>
          <h2 className="font-display text-2xl">Change email</h2>
          {changed && !pendingEmail && (
            <p className="mt-3 rounded-lg border border-leaf/50 px-3 py-2 text-sm text-leaf" role="status">
              Email changed. Use {user.email} to log in from now on. Other devices have been signed out.
            </p>
          )}
          {pendingEmail ? (
            <>
              <p className="mb-5 mt-1 text-sm text-muted">
                We sent a 6-digit code to <span className="font-medium text-ink">{maskEmail(pendingEmail)}</span>. Your login stays {user.email} until you enter it.
              </p>
              <ActionForm action={confirmEmailChange} submit="Confirm new email">
                <input type="hidden" name="slug" value={slug} />
                <CodeInput />
              </ActionForm>
              <form action={cancelEmailChange} className="mt-4">
                <input type="hidden" name="slug" value={slug} />
                <button className="text-sm underline decoration-line underline-offset-4 hover:decoration-ink">Cancel</button>
              </form>
            </>
          ) : (
            <>
              <p className="mb-5 mt-1 text-sm text-muted">We&apos;ll email a code to the new address. Your login only changes once you enter it.</p>
              <ActionForm action={startEmailChange} submit="Send code">
                <input type="hidden" name="slug" value={slug} />
                <Field label="New email" name="email" type="email" autoComplete="email" required />
                <Field label="Current password" name="current" type="password" autoComplete="current-password" required />
              </ActionForm>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
