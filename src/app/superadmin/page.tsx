import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { listPlatformBusinesses, listPlatformUsers } from "@/lib/store";
import { PageHeader, card, eyebrow, when } from "../admin/[slug]/ui";
import { planLabel, planState } from "@/lib/options";
import { StateBadge, TopBar, shell } from "./ui";

export default async function SuperAdmin() {
  const user = await requireSuperAdmin();
  const [businesses, users] = await Promise.all([listPlatformBusinesses(), listPlatformUsers()]);
  const states = businesses.map((b) => planState(b));
  const totals = [
    { label: "Businesses", n: businesses.length },
    { label: "Owners", n: users.length },
    { label: "On a plan", n: states.filter((s) => s.tone === "ok" || s.tone === "warn").length },
    { label: "Expired or no plan", n: states.filter((s) => s.label === "No plan" || s.label.endsWith("expired")).length },
    { label: "Suspended", n: businesses.filter((b) => b.suspended).length },
    { label: "Plan requests", n: businesses.filter((b) => b.requestedPlan).length },
    { label: "QR scans", n: businesses.reduce((s, b) => s + b.visits, 0) },
    { label: "Drafts", n: businesses.reduce((s, b) => s + b.drafts, 0) },
  ];

  return (
    <main className={shell}>
      <TopBar email={user.email} />
      <div className="mt-8">
        <PageHeader eyebrow="Whole platform" title="All businesses" />
      </div>

      <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4 lg:grid-cols-8" aria-label="Totals">
        {totals.map((t) => (
          <div key={t.label} className="bg-card p-4">
            <p className={eyebrow}>{t.label}</p>
            <p className="mt-1 font-display text-3xl tabular-nums">{t.n}</p>
          </div>
        ))}
      </section>

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
                  </td>
                  <td className="px-3 py-3">{b.ownerEmail ?? <span className="text-muted">no owner</span>}</td>
                  <td className="px-3 py-3">
                    <StateBadge state={states[i]} />
                    {b.planExpiresAt && !b.suspended && <span className="block text-xs text-muted">until {when(b.planExpiresAt)}</span>}
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
