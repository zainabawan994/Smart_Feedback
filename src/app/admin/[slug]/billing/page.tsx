import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin, requireOwnerPage } from "@/lib/auth";
import { cancelPayment, cancelPlan } from "@/lib/actions";
import { listPayments, type Payment } from "@/lib/store";
import { PAYMENT_METHODS, PLANS, asPlan, daysUntil, dollars, isFuture, planLabel, planState, rupees } from "@/lib/options";
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
  if (picked) redirect(`/admin/${slug}/billing/buy?plan=${picked}`); // old "?plan=" links go straight to checkout
  const { user, business: b, asAdmin: readOnly } = await requireOwnerPage(slug);
  // The platform owner doesn't pay herself: her businesses get plans straight from the super-admin panel.
  const platformOwner = await isAdmin(user);
  const payments = await listPayments({ slug }, 50);
  const pending = payments.find((p) => p.status === "pending");
  const lastPaid = payments.find((p) => p.status === "approved");
  const state = planState(b);
  const daysLeft = b.planExpiresAt ? daysUntil(b.planExpiresAt) : null;
  const active = Boolean(b.plan && isFuture(b.planExpiresAt));
  // Started: the approved payment, or (plan switched on by the admin) the end date minus the plan's length.
  const started = lastPaid?.decidedAt
    ?? (b.plan && b.planExpiresAt ? new Date(new Date(b.planExpiresAt).setMonth(new Date(b.planExpiresAt).getMonth() - PLANS.find((p) => p.key === b.plan)!.months)).toISOString() : null);

  return (
    <div className={page}>
      <PageHeader eyebrow={`${b.name} · Plan & billing`} title="Plan & billing">
        <a href="#plans" className="text-sm underline decoration-line underline-offset-4 hover:decoration-ink">
          See plans
        </a>
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
            ["Started", started ? day(started) : "—"],
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
              Cancel plan: your desk keeps working until {day(b.planExpiresAt!)}, then the plan is not renewed. For a refund of the remaining time, contact Tavo support.
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

      {/* All plans, to compare and pick */}
      <section id="plans" className={`${card} mt-6 scroll-mt-6`}>
        <h2 className="font-display text-2xl">Plans</h2>
        <p className="mt-1 text-sm text-muted">Every plan has every feature. Longer plans cost less each month.</p>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {PLANS.map((p) => {
            const current = active && b.plan === p.key;
            return (
              <li key={p.key}>
                <Link
                  href={`/admin/${slug}/billing/buy?plan=${p.key}`}
                  className={`flex h-full flex-col rounded-xl border-2 bg-paper p-4 transition hover:border-ink ${current ? "border-leaf" : "border-line"}`}
                >
                  <span className="flex items-center justify-between gap-2 font-display text-xl">
                    {p.label}
                    {current && <span className="rounded-full bg-leaf px-2.5 py-0.5 font-sans text-xs text-paper">Current</span>}
                  </span>
                  <span className="mt-2 font-display text-3xl tabular-nums">{rupees(p.pkr)}</span>
                  <span className="font-mono text-xs text-muted">≈ {dollars(p.usd)} USD</span>
                  <span className="mt-1 text-sm text-muted">
                    {p.months === 1 ? "1 month" : `${p.months} months`} · {rupees(Math.round(p.pkr / p.months))} a month
                  </span>
                  <span className="mt-4 rounded-full bg-tomato px-4 py-2 text-center text-sm font-medium text-tomato-ink">
                    {readOnly ? "View" : current ? "Renew" : "Buy"} {p.label} →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {readOnly && <p className="mt-3 text-sm text-muted">Main admin: owners buy here. To switch a plan on yourself, use Manage this business.</p>}
        {!readOnly && pending && <p className="mt-3 text-sm text-muted">You have a payment being checked; you can buy another plan once it&apos;s confirmed.</p>}
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
          <h2 className="font-display text-2xl">You run Tavo</h2>
          <p className="mt-1 text-sm text-muted">As super admin you don&apos;t buy plans for your own businesses. Set this one&apos;s plan directly.</p>
          <Link href={`/superadmin/${slug}`} className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition hover:opacity-90">
            Set plan in super admin →
          </Link>
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
