import Link from "next/link";
import { isSuperAdmin, requireOwnerPage } from "@/lib/auth";
import { cancelPayment, cancelPlan, submitPayment } from "@/lib/actions";
import { listPayments, type Payment } from "@/lib/store";
import { PAYMENT_METHODS, PLANS, asPlan, daysUntil, isFuture, planLabel, planState, rupees } from "@/lib/options";
import { paymentAccounts } from "@/lib/billing";
import { ActionForm, Field, ReceiptInput, inputCls } from "@/components/forms";
import { StateBadge } from "@/app/superadmin/ui";
import { PageHeader, card, day, eyebrow, page, when } from "../ui";

const STATUS: Record<Payment["status"], { label: string; cls: string }> = {
  pending: { label: "Being checked", cls: "text-tomato" },
  approved: { label: "Approved", cls: "text-leaf" },
  rejected: { label: "Rejected", cls: "text-plum" },
  cancelled: { label: "Cancelled by you", cls: "text-muted" },
  refunded: { label: "Refunded", cls: "text-muted" },
};
const methodLabel = (m: Payment["method"]) => PAYMENT_METHODS.find((x) => x.key === m)?.label ?? m;
const btn = "rounded-full border border-ink px-4 py-2 text-sm transition hover:bg-ink hover:text-paper";

export default async function BillingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ plan?: string }> }) {
  const { slug } = await params;
  const picked = asPlan((await searchParams).plan);
  const { user, business: b, readOnly } = await requireOwnerPage(slug);
  // The platform owner doesn't pay herself: her businesses get plans straight from the super-admin panel.
  const platformOwner = isSuperAdmin(user);
  const payments = await listPayments({ slug }, 50);
  const accounts = paymentAccounts();
  const pending = payments.find((p) => p.status === "pending");
  const lastPaid = payments.find((p) => p.status === "approved");
  const state = planState(b);
  const daysLeft = b.planExpiresAt ? daysUntil(b.planExpiresAt) : null;
  const active = Boolean(b.plan && isFuture(b.planExpiresAt));
  const chosen = picked ?? b.requestedPlan ?? b.plan ?? "6months";

  return (
    <div className={page}>
      <PageHeader eyebrow={`${b.name} · Plan & billing`} title="Plan & billing">
        <Link href="/#pricing" className="text-sm underline decoration-line underline-offset-4 hover:decoration-ink">
          Compare plans
        </Link>
      </PageHeader>

      {/* Current plan */}
      <section className={`${card} mt-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Your plan</h2>
          <StateBadge state={state} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          {[
            ["Plan", b.plan ? planLabel(b.plan) : "None yet"],
            ["Started", lastPaid?.decidedAt ? day(lastPaid.decidedAt) : "—"],
            ["Ends on", b.planExpiresAt ? day(b.planExpiresAt) : "—"],
            ["Days left", daysLeft === null ? "—" : !active ? "Expired" : String(daysLeft)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className={eyebrow}>{k}</dt>
              <dd className="mt-1 font-display text-xl">{v}</dd>
            </div>
          ))}
        </dl>
        {lastPaid && (
          <p className="mt-3 text-sm text-muted">
            Last payment: {planLabel(lastPaid.plan)}, {rupees(lastPaid.amountPkr)} by {methodLabel(lastPaid.method)} on {day(lastPaid.createdAt)}.
          </p>
        )}

        {active && !readOnly && (
          <div className="dashed my-5" />
        )}
        {active && !readOnly && !b.planCancelledAt && (
          <form action={cancelPlan} className="flex flex-wrap items-center justify-between gap-3">
            <input type="hidden" name="slug" value={slug} />
            <p className="max-w-xl text-sm text-muted">
              Cancel plan: your desk keeps working until {day(b.planExpiresAt!)}, then the plan is not renewed. For a refund of the remaining time, contact SmartFeedback support.
            </p>
            <button className="rounded-full border border-plum px-4 py-2 text-sm text-plum transition hover:bg-plum hover:text-paper">Cancel plan</button>
          </form>
        )}
        {active && !readOnly && b.planCancelledAt && (
          <form action={cancelPlan} className="flex flex-wrap items-center justify-between gap-3">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="undo" value="1" />
            <p className="text-sm">
              <span className="font-medium">Cancelled on {day(b.planCancelledAt)}.</span> Your desk works until {day(b.planExpiresAt!)}.
            </p>
            <button className={btn}>Keep my plan</button>
          </form>
        )}
      </section>

      {/* Pending payment */}
      {pending && (
        <section className={`${card} mt-6 border-mustard`}>
          <h2 className="font-display text-2xl">Payment being checked</h2>
          <p className="mt-2 text-sm">
            {planLabel(pending.plan)} · {rupees(pending.amountPkr)} · {methodLabel(pending.method)} · TID <span className="font-mono">{pending.reference}</span> · sent {when(pending.createdAt)}
          </p>
          <p className="mt-1 text-sm text-muted">Your plan switches on as soon as we find it in our account, usually within a day.</p>
          {!readOnly && (
            <form action={cancelPayment} className="mt-4">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={pending.id} />
              <button className={btn}>Cancel this payment</button>
              <span className="ml-3 text-xs text-muted">Made a mistake in the amount or TID? Cancel it and submit again.</span>
            </form>
          )}
        </section>
      )}

      {platformOwner && !readOnly && (
        <section className={`${card} mt-6`}>
          <h2 className="font-display text-2xl">You run SmartFeedback</h2>
          <p className="mt-1 text-sm text-muted">As super admin you don&apos;t buy plans for your own businesses. Set this one&apos;s plan directly.</p>
          <Link href={`/superadmin/${slug}`} className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition hover:opacity-90">
            Set plan in super admin →
          </Link>
        </section>
      )}

      {/* Buy / renew */}
      {!readOnly && !pending && !platformOwner && (
        <section className={`${card} mt-6`}>
          <h2 className="font-display text-2xl">{active ? "Renew or change plan" : "Buy a plan"}</h2>
          {active && <p className="mt-1 text-sm text-muted">Renewing the same plan adds its time after your current end date.</p>}
          {accounts.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Payment details will be added here soon. Contact SmartFeedback support to buy a plan.</p>
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
                    <ReceiptInput />
                  </ActionForm>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* History */}
      <section className={`${card} mt-6 p-0`}>
        <h2 className="px-5 pt-5 font-display text-2xl">Payment history</h2>
        {payments.length === 0 ? (
          <p className="px-5 pb-5 pt-2 text-sm text-muted">No payments yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className={eyebrow}>
                <tr className="border-b border-line">
                  <th className="px-5 py-2 font-normal">Date</th>
                  <th className="px-3 py-2 font-normal">Plan</th>
                  <th className="px-3 py-2 text-right font-normal">Amount</th>
                  <th className="px-3 py-2 font-normal">Method · TID</th>
                  <th className="px-5 py-2 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3 text-muted">{day(p.createdAt)}</td>
                    <td className="px-3 py-3">{planLabel(p.plan)}</td>
                    <td className="px-3 py-3 text-right font-mono">{rupees(p.amountPkr)}</td>
                    <td className="px-3 py-3">
                      {methodLabel(p.method)} · <span className="font-mono text-xs">{p.reference}</span>
                      {p.hasReceipt && <span className="block text-xs text-muted">screenshot attached</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={STATUS[p.status].cls}>{STATUS[p.status].label}</span>
                      {p.note && (p.status === "rejected" || p.status === "refunded") && <span className="block text-xs text-muted">{p.note}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
