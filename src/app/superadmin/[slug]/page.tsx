import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { decidePaymentAction, superAdminDeleteBusiness, superAdminOwnerAccount, superAdminSetOwner, superAdminUpdateBusiness } from "@/lib/actions";
import { getStats, listPayments, listPlatformBusinesses } from "@/lib/store";
import { ActionForm, Field, inputCls } from "@/components/forms";
import { PageHeader, card, day, eyebrow, when } from "../../admin/[slug]/ui";
import { PAYMENT_METHODS, PLANS, TIME_ZONE, planLabel, planState, rupees } from "@/lib/options";
import { StateBadge, TopBar, shell } from "../ui";

const dateInput = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(iso)); // YYYY-MM-DD

export default async function ManageBusiness({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireSuperAdmin();
  const [all, stats, payments] = await Promise.all([listPlatformBusinesses(), getStats(slug), listPayments({ slug }, 20)]);
  const b = all.find((x) => x.slug === slug);
  if (!b) notFound();
  const c = stats.counts;
  const facts = [
    ["Owner", b.ownerEmail ?? "no owner"],
    ["City", b.city],
    ["Type", b.kind],
    ["Created", b.createdAt ? when(b.createdAt) : "unknown"],
    ["Last activity", b.lastActivity ? when(b.lastActivity) : "never"],
    ["Google link", b.googleReviewUrl && !b.googleReviewUrl.includes("REPLACE_WITH") ? "set" : "missing"],
    ["Menu items", String(b.menu.length)],
  ];

  return (
    <main className={shell}>
      <TopBar email={user.email} />
      <p className="mt-6 text-sm">
        <Link href="/superadmin" className="underline underline-offset-4">
          ← All businesses
        </Link>
      </p>
      <div className="mt-4">
        <PageHeader eyebrow={`${b.city} · ${b.slug}`} title={b.name}>
          <StateBadge state={planState(b)} />
        </PageHeader>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="font-display text-2xl">Controls</h2>
          <p className="mb-5 mt-1 text-sm text-muted">Suspending switches off the customer page and pauses the owner&apos;s desk. Nothing is deleted.</p>
          {b.planCancelledAt && b.planExpiresAt && (
            <p className="mb-5 rounded-lg border border-mustard px-3 py-2 text-sm">
              Owner cancelled the plan on {day(b.planCancelledAt)}. It runs until {day(b.planExpiresAt)} and won&apos;t renew. To end it now, set Plan to &quot;No plan&quot;.
            </p>
          )}
          {b.requestedPlan && (
            <p className="mb-5 rounded-lg border border-tomato px-3 py-2 text-sm">
              Owner requested the <span className="font-medium">{planLabel(b.requestedPlan)}</span> plan. Choose it below and save to switch it on.
            </p>
          )}
          <ActionForm action={superAdminUpdateBusiness} submit="Save">
            <input type="hidden" name="slug" value={b.slug} />
            <label className="flex items-center gap-3 rounded-lg border border-line px-3 py-3">
              <input type="checkbox" name="suspended" defaultChecked={b.suspended} className="h-4 w-4 accent-[var(--plum)]" />
              <span>
                <span className="font-medium">Suspended</span>
                <span className="block text-xs text-muted">Customers see &quot;Feedback is paused&quot;; the owner sees a paused desk.</span>
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Plan</span>
              <select name="plan" defaultValue={b.plan ?? b.requestedPlan ?? ""} className={`${inputCls} mt-1.5`}>
                <option value="">No plan</option>
                {PLANS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Plan ends on</span>
              <span className="ml-2 text-xs text-muted">leave empty to start today</span>
              <input type="date" name="expires" defaultValue={b.planExpiresAt ? dateInput(b.planExpiresAt) : ""} className={`${inputCls} mt-1.5`} />
            </label>
          </ActionForm>
        </section>

        <section className={card}>
          <h2 className="font-display text-2xl">At a glance</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className={eyebrow}>{k}</dt>
                <dd className="mt-0.5 break-words">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="dashed my-5" />
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ["Scans", c.visit],
              ["Drafts", c.generate],
              ["Copied", c.copy],
              ["Google", c.google],
            ].map(([k, n]) => (
              <div key={k} className="rounded-xl border border-line bg-paper p-3">
                <p className={eyebrow}>{k}</p>
                <p className="mt-1 font-display text-2xl tabular-nums">{n}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/admin/${b.slug}`} className="rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition hover:opacity-90">
              Open & edit their desk
            </Link>
            <a href={`/r/${b.slug}`} target="_blank" className="rounded-full border border-ink px-5 py-2.5 text-sm transition hover:bg-ink hover:text-paper">
              Customer page ↗
            </a>
          </div>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="font-display text-2xl">Owner access</h2>
        <p className="mt-1 text-sm text-muted">
          The owner sees and edits only their own businesses. {b.ownerEmail ? <>Current owner: <span className="font-medium text-ink">{b.ownerEmail}</span>.</> : "No owner yet."}
        </p>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className={eyebrow}>{b.ownerEmail ? "Move to another owner" : "Give access"}</h3>
            <p className="mb-3 mt-1 text-xs text-muted">The previous owner loses access. Password is needed only for a new email.</p>
            <ActionForm action={superAdminSetOwner} submit={b.ownerEmail ? "Move business" : "Give access"}>
              <input type="hidden" name="slug" value={b.slug} />
              <Field label="Owner email" name="ownerEmail" type="email" autoComplete="off" required />
              <Field label="Password" hint="new owner only · 8+ characters" name="password" type="password" autoComplete="new-password" minLength={8} />
            </ActionForm>
          </div>
          {b.ownerEmail && (
            <div>
              <h3 className={eyebrow}>Owner&apos;s login</h3>
              <p className="mb-3 mt-1 text-xs text-muted">A new password logs the owner out on every device.</p>
              <ActionForm action={superAdminOwnerAccount} submit="Save login">
                <input type="hidden" name="slug" value={b.slug} />
                <Field label="New password" hint="8+ characters" name="password" type="password" autoComplete="new-password" minLength={8} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="verify" className="h-4 w-4" /> Mark email verified (skip the email code)
                </label>
              </ActionForm>
            </div>
          )}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="font-display text-2xl">Payments</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No payments reported yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {payments.map((p) => (
              <li key={p.id} className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-center">
                <span>
                  {planLabel(p.plan)} · {rupees(p.amountPkr)} · {PAYMENT_METHODS.find((m) => m.key === p.method)?.label} · TID <span className="font-mono">{p.reference}</span> · from {p.payer}
                  <span className="block text-xs text-muted">
                    <span className={p.status === "approved" ? "text-leaf" : p.status === "pending" ? "text-tomato" : "text-plum"}>{p.status}</span> · {when(p.createdAt)}
                    {p.note && <> · {p.note}</>}
                    {p.hasReceipt && (
                      <>
                        {" · "}
                        <Link href={`/superadmin/receipt/${p.id}`} className="text-tomato underline underline-offset-2">
                          screenshot
                        </Link>
                      </>
                    )}
                  </span>
                </span>
                {(p.status === "pending" || p.status === "approved") && (
                  <form action={decidePaymentAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input name="note" placeholder={p.status === "pending" ? "Reason if rejecting" : "Refund note"} maxLength={200} className="w-40 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm" aria-label="Note" />
                    {p.status === "pending" ? (
                      <>
                        <button name="decision" value="reject" className="rounded-full border border-plum px-3 py-1.5 text-sm text-plum transition hover:bg-plum hover:text-paper">
                          Reject
                        </button>
                        <button name="decision" value="approve" className="rounded-full bg-leaf px-4 py-1.5 text-sm text-paper transition hover:opacity-90">
                          Approve
                        </button>
                      </>
                    ) : (
                      <>
                        <label className="flex items-center gap-1.5 text-xs">
                          <input type="checkbox" name="endPlan" /> end plan now
                        </label>
                        <button name="decision" value="refund" className="rounded-full border border-ink px-3 py-1.5 text-sm transition hover:bg-ink hover:text-paper">
                          Mark refunded
                        </button>
                      </>
                    )}
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${card} mt-6 border-plum`}>
        <h2 className="font-display text-2xl text-plum">Delete business</h2>
        <p className="mt-1 text-sm text-muted">
          Removes {b.name}, its customer page, QR scans, drafts, insights and payment records for good. This cannot be undone. The owner&apos;s account stays; to pause instead, tick Suspended above.
        </p>
        <div className="mt-4 max-w-md">
          <ActionForm action={superAdminDeleteBusiness} submit="Delete this business forever">
            <input type="hidden" name="slug" value={b.slug} />
            <Field label={`Type ${b.slug} to confirm`} name="confirm" autoComplete="off" required />
          </ActionForm>
        </div>
      </section>
    </main>
  );
}
