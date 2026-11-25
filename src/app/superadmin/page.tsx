import Link from "next/link";
import { adminEmails, allAdminEmails, requireSuperAdmin } from "@/lib/auth";
import { decidePaymentAction, superAdminAddAdmin, superAdminRemoveAdmin, superAdminSetupAdmin } from "@/lib/actions";
import { blockedReviewCounts, getUserByEmail, listPayments, listPlatformBusinesses, listPlatformUsers } from "@/lib/store";
import { ActionForm, Field } from "@/components/forms";
import { PageHeader, card, day, eyebrow, when } from "../admin/[slug]/ui";
import { PAYMENT_METHODS, planLabel, planState, rupees } from "@/lib/options";
import { StateBadge, TopBar, shell } from "./ui";

export default async function SuperAdmin({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const user = await requireSuperAdmin();
  const [businesses, users, pending, blockedBy] = await Promise.all([listPlatformBusinesses(), listPlatformUsers(), listPayments({ status: "pending" }), blockedReviewCounts()]);
  const mainAdmins = adminEmails();
  const team = await Promise.all((await allAdminEmails()).map(async (email) => ({ email, main: mainAdmins.includes(email), user: await getUserByEmail(email) })));
  const nameOf = (slug: string) => businesses.find((b) => b.slug === slug)?.name ?? slug;
  const states = businesses.map((b) => planState(b));
  const totals = [
    { label: "Businesses", n: businesses.length },
    { label: "Owners", n: users.length },
    { label: "On a plan", n: states.filter((s) => s.tone === "ok" || s.tone === "warn").length },
    { label: "Expired or no plan", n: states.filter((s) => s.label === "No plan" || s.label.endsWith("expired")).length },
    { label: "Suspended", n: businesses.filter((b) => b.suspended).length },
    { label: "Payments to review", n: pending.length },
    { label: "QR scans", n: businesses.reduce((s, b) => s + b.visits, 0) },
    { label: "Drafts", n: businesses.reduce((s, b) => s + b.drafts, 0) },
  ];

  return (
    <main className={shell}>
      <TopBar email={user.email} />
      <div className="mt-8">
        <PageHeader eyebrow="Whole platform" title="All businesses">
          <span className="flex flex-wrap gap-2">
            <a href="#team" className="rounded-full border border-ink px-5 py-2.5 text-sm transition hover:bg-ink hover:text-paper">
              Team admins ({team.length})
            </a>
            <Link href="/superadmin/new" className="rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition hover:opacity-90">
              + Add business &amp; owner
            </Link>
          </span>
        </PageHeader>
      </div>

      {deleted && <p className="mt-6 rounded-lg border border-leaf/50 px-3 py-2 text-sm text-leaf" role="status">Business deleted.</p>}

      <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4 lg:grid-cols-8" aria-label="Totals">
        {totals.map((t) => (
          <div key={t.label} className="bg-card p-4">
            <p className={eyebrow}>{t.label}</p>
            <p className="mt-1 font-display text-3xl tabular-nums">{t.n}</p>
          </div>
        ))}
      </section>

      <section className={`${card} mt-6`} id="team" aria-label="Team admins">
        <h2 className="font-display text-2xl">Team admins</h2>
        <p className="mt-1 text-sm text-muted">Everyone here has full admin access. To add a teammate, type their email and a password, then click Add admin. They can log in at once at /superadmin/login.</p>
        <div className="mt-4 max-w-xl rounded-xl border border-ink bg-paper p-4">
          <ActionForm action={superAdminAddAdmin} submit="Add admin">
            <Field label="Teammate's email" name="email" type="email" autoComplete="off" required />
            <Field label="Password for them" hint="8+ characters" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </ActionForm>
        </div>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {team.map(({ email, main, user: u }) => (
            <li key={email} className="rounded-xl border border-line bg-paper p-4">
              <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">{email}</span>
                <span className={u ? "text-leaf" : "text-tomato"}>
                  {u ? (email === user.email.toLowerCase() ? "✓ you" : "✓ has an account") : "no account yet"}
                  {main && <span className="ml-2 text-muted">· main admin</span>}
                </span>
              </p>
              {email !== user.email.toLowerCase() && (
                <div className="mt-3">
                  <ActionForm action={superAdminSetupAdmin} submit={u ? "Reset password" : "Create account"}>
                    <input type="hidden" name="email" value={email} />
                    <Field label={u ? "New password" : "Password"} hint="8+ characters" name="password" type="password" autoComplete="new-password" minLength={8} required />
                  </ActionForm>
                  {!main && (
                    <form action={superAdminRemoveAdmin} className="mt-2 text-right">
                      <input type="hidden" name="email" value={email} />
                      <button className="text-sm text-plum underline underline-offset-4">Remove admin access</button>
                    </form>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {pending.length > 0 && (
        <section className={`${card} mt-6 border-tomato`} aria-label="Payments to review">
          <h2 className="font-display text-2xl">Payments to review</h2>
          <p className="mt-1 text-sm text-muted">Find each one in your bank / Easypaisa / JazzCash statement, then approve it. Approving switches the plan on (or extends it).</p>
          <ul className="mt-4 grid gap-3">
            {pending.map((p) => (
              <li key={p.id} className="grid gap-3 rounded-xl border border-line bg-paper p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="text-sm">
                  <p>
                    <span className="font-medium">{nameOf(p.slug)}</span> · {planLabel(p.plan)} · <span className="font-mono">{rupees(p.amountPkr)}</span>
                  </p>
                  <p className="mt-0.5 text-muted">
                    {PAYMENT_METHODS.find((m) => m.key === p.method)?.label} · TID <span className="font-mono text-ink">{p.reference}</span> · from {p.payer} · {when(p.createdAt)}
                  </p>
                  {p.hasReceipt ? (
                    <Link href={`/superadmin/receipt/${p.id}`} className="mt-1 inline-block text-sm text-tomato underline underline-offset-4">
                      View payment screenshot →
                    </Link>
                  ) : (
                    <p className="mt-1 text-xs text-muted">No screenshot attached</p>
                  )}
                </div>
                <form action={decidePaymentAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input name="note" placeholder="Reason if rejecting" maxLength={200} className="w-44 rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm" aria-label="Reason if rejecting" />
                  <button name="decision" value="reject" className="rounded-full border border-plum px-3 py-1.5 text-sm text-plum transition hover:bg-plum hover:text-paper">
                    Reject
                  </button>
                  <button name="decision" value="approve" className="rounded-full bg-leaf px-4 py-1.5 text-sm text-paper transition hover:opacity-90">
                    Approve
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${card} mt-6 p-0`}>
        <h2 className="px-5 pt-5 font-display text-2xl">Businesses</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className={eyebrow}>
              <tr className="border-b border-line">
                <th className="px-5 py-2 font-normal">Business</th>
                <th className="px-3 py-2 font-normal">Owner</th>
                <th className="px-3 py-2 font-normal">Plan</th>
                <th className="px-3 py-2 text-right font-normal">Scans</th>
                <th className="px-3 py-2 text-right font-normal">Drafts</th>
                <th className="px-3 py-2 font-normal">Last activity</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {businesses.map((b, i) => (
                <tr key={b.slug}>
                  <td className="px-5 py-3">
                    <span className="font-medium">{b.name}</span>
                    <span className="block text-xs text-muted">
                      {b.city} · {b.slug}
                    </span>
                    {blockedBy[b.slug] > 0 && (
                      <span className="mt-1 inline-block rounded-full bg-plum px-2 py-0.5 text-xs text-paper" title="Reviews blocked because one phone or network tried too many times">
                        ⚠ {blockedBy[b.slug]} blocked review {blockedBy[b.slug] === 1 ? "try" : "tries"} this week
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">{b.ownerEmail ?? <span className="text-muted">no owner</span>}</td>
                  <td className="px-3 py-3">
                    <StateBadge state={states[i]} />
                    {b.planExpiresAt && !b.suspended && <span className="block text-xs text-muted">until {day(b.planExpiresAt)}</span>}
                    {b.requestedPlan && <span className="mt-1 block text-xs font-medium text-tomato">requested: {planLabel(b.requestedPlan)}</span>}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{b.visits}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{b.drafts}</td>
                  <td className="px-3 py-3 text-muted">{b.lastActivity ? when(b.lastActivity) : "never"}</td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/superadmin/${b.slug}`} className="rounded-full border border-ink px-3 py-1.5 text-xs transition hover:bg-ink hover:text-paper">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${card} mt-6 p-0`}>
        <h2 className="px-5 pt-5 font-display text-2xl">Owners</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className={eyebrow}>
              <tr className="border-b border-line">
                <th className="px-5 py-2 font-normal">Email</th>
                <th className="px-3 py-2 font-normal">Email verified</th>
                <th className="px-3 py-2 text-right font-normal">Businesses</th>
                <th className="px-5 py-2 font-normal">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3">{u.email}</td>
                  <td className="px-3 py-3">{u.emailVerified ? <span className="text-leaf">✓ yes</span> : <span className="text-plum">not yet</span>}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{u.businesses}</td>
                  <td className="px-5 py-3 text-muted">{when(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
