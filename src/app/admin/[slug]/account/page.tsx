import Link from "next/link";
import { cookies } from "next/headers";
import { requireOwnerPage } from "@/lib/auth";
import { cancelEmailChange, changePassword, confirmEmailChange, logout, startEmailChange, submitPayment } from "@/lib/actions";
import { PLANS, asPlan, planLabel, planState, rupees } from "@/lib/options";
import { paymentAccounts } from "@/lib/billing";
import { listBusinesses, listPayments } from "@/lib/store";
import { maskEmail } from "@/lib/mask";
import { ActionForm, CodeInput, Field, inputCls } from "@/components/forms";
import { PageHeader, card, day, eyebrow, page, when } from "../ui";

export default async function AccountPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ changed?: string; plan?: string }> }) {
  const { slug } = await params;
  const { changed, plan: picked } = await searchParams;
  const { user, business, readOnly } = await requireOwnerPage(slug);
  const state = planState(business);
  const [businesses, payments] = await Promise.all([listBusinesses(user.id), listPayments({ slug }, 10)]);
  const accounts = paymentAccounts();
  const pending = payments.find((p) => p.status === "pending");
  const chosen = asPlan(picked) ?? business.requestedPlan ?? "6months";
  const pendingEmail = (await cookies()).get("sf_new_email")?.value;
  return (
    <div className={page}>
      <PageHeader eyebrow="Your account" title="Account" />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section id="plan" className={`${card} lg:col-span-2`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">Plan for {business.name}</h2>
            <Link href="/#pricing" className="text-sm underline decoration-line underline-offset-4 hover:decoration-ink">
              Compare plans
            </Link>
          </div>
          <p className="mt-2 text-sm">
            Current: <span className="font-medium">{state.label}</span>
            {business.plan && business.planExpiresAt && <span className="text-muted"> · until {day(business.planExpiresAt)}</span>}
          </p>
          {pending && (
            <p className="mt-3 rounded-lg border border-mustard px-3 py-2 text-sm">
              <span className="font-medium">Payment received, being checked:</span> {planLabel(pending.plan)}, {rupees(pending.amountPkr)}, transaction {pending.reference}. Your plan switches on once
              we confirm it, usually within a day.
            </p>
          )}

          {!readOnly && !pending && (
            accounts.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Online payment details will be added here soon. Contact SmartFeedback support to buy a plan.</p>
            ) : (
              <div className="mt-5 grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className={eyebrow}>1 · Send the amount to</h3>
                  <ul className="mt-3 grid gap-3">
                    {accounts.map((a) => (
                      <li key={a.method} className="rounded-xl border border-line bg-paper p-4 text-sm">
                        <p className="font-medium">{a.label}</p>
                        {a.lines.map((l) => (
                          <p key={l} className="mt-0.5 font-mono text-[13px]">
                            {l}
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted">Keep the receipt. You&apos;ll need its transaction ID (TID) in step 2.</p>
                </div>
                <div>
                  <h3 className={eyebrow}>2 · Tell us you paid</h3>
                  <div className="mt-3">
                    <ActionForm action={submitPayment} submit="Submit payment">
                      <input type="hidden" name="slug" value={slug} />
                      <fieldset className="grid gap-2">
                        <legend className="mb-1 text-sm font-medium">Plan</legend>
                        {PLANS.map((p) => (
                          <label key={p.key} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 has-[:checked]:border-ink">
                            <span className="flex items-center gap-2">
                              <input type="radio" name="plan" value={p.key} defaultChecked={p.key === chosen} required />
                              {p.label}
                            </span>
                            <span className="font-mono text-sm">{rupees(p.pkr)}</span>
                          </label>
                        ))}
                      </fieldset>
                      <label className="block">
                        <span className="text-sm font-medium">Paid with</span>
                        <select name="method" className={`${inputCls} mt-1.5`} required>
                          {accounts.map((a) => (
                            <option key={a.method} value={a.method}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Field label="Transaction ID" hint="from your receipt" name="reference" required minLength={6} maxLength={60} autoComplete="off" />
                      <Field label="Paid from" hint="your name or mobile number" name="payer" required maxLength={80} />
                    </ActionForm>
                  </div>
                </div>
              </div>
            )
          )}

          {payments.length > 0 && (
            <div className="mt-6">
              <h3 className={eyebrow}>Payment history</h3>
              <ul className="mt-2 divide-y divide-line text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                    <span>
                      {planLabel(p.plan)} · {rupees(p.amountPkr)} · <span className="font-mono text-xs">{p.reference}</span>
                      {p.status === "rejected" && p.note && <span className="block text-xs text-plum">{p.note}</span>}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className={p.status === "approved" ? "text-leaf" : p.status === "rejected" ? "text-plum" : "text-muted"}>{p.status}</span>
                      <span className="font-mono text-xs text-muted">{when(p.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

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
