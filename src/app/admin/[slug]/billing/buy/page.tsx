import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOwnerPage } from "@/lib/auth";
import { submitPayment } from "@/lib/actions";
import { listPayments } from "@/lib/store";
import { PLANS, asPlan, isFuture, planEnd, planInfo, rupees } from "@/lib/options";
import { paymentAccounts } from "@/lib/billing";
import { ActionForm, Field, ReceiptInput, inputCls } from "@/components/forms";
import { PageHeader, card, day, eyebrow, page } from "../../ui";

/** Checkout for one plan: what you get, where to send the money, then the payment form. */
export default async function BuyPlanPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ plan?: string }> }) {
  const { slug } = await params;
  const plan = asPlan((await searchParams).plan);
  if (!plan) redirect(`/admin/${slug}/billing#plans`);
  const { business: b, asAdmin } = await requireOwnerPage(slug);
  const info = planInfo(plan);
  const active = Boolean(b.plan && isFuture(b.planExpiresAt));
  const newEnd = planEnd(active ? b.planExpiresAt : null, info.months);
  const pending = (await listPayments({ slug }, 20)).find((p) => p.status === "pending");
  const accounts = paymentAccounts();
  const back = `/admin/${slug}/billing`;

  return (
    <div className={page}>
      <PageHeader eyebrow={`${b.name} · Buy a plan`} title={`${info.label} plan`}>
        <Link href={`${back}#plans`} className="text-sm underline decoration-line underline-offset-4 hover:decoration-ink">
          ← All plans
        </Link>
      </PageHeader>

      {/* What they're buying */}
      <section className={`${card} mt-6`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={eyebrow}>You pay</p>
            <p className="mt-1 font-display text-5xl tabular-nums">{rupees(info.pkr)}</p>
            <p className="mt-1 text-sm text-muted">
              {info.months === 1 ? "1 month" : `${info.months} months`} · {rupees(Math.round(info.pkr / info.months))} a month · every feature included
            </p>
          </div>
          <div className="text-sm sm:text-right">
            <p className={eyebrow}>Your plan will run until</p>
            <p className="mt-1 font-display text-2xl">{day(newEnd)}</p>
            {active && <p className="mt-0.5 text-muted">added after your current end date</p>}
          </div>
        </div>
        <div className="dashed my-5" />
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted">Switch plan:</span>
          {PLANS.map((p) => (
            <Link
              key={p.key}
              href={`${back}/buy?plan=${p.key}`}
              className={`rounded-full px-3 py-1 ${p.key === plan ? "bg-ink text-paper" : "border border-line hover:border-ink"}`}
            >
              {p.label} · {rupees(p.pkr)}
            </Link>
          ))}
        </div>
      </section>

      {asAdmin ? (
        <p className={`${card} mt-6 text-sm text-muted`}>
          This is the screen the owner sees to pay. As main admin you don&apos;t pay here: switch a plan on from{" "}
          <Link href={`/superadmin/${slug}`} className="text-ink underline underline-offset-4">Manage this business</Link>.
        </p>
      ) : pending ? (
        <p className={`${card} mt-6 border-mustard text-sm`}>
          You already have a payment being checked. You can buy another plan once it&apos;s confirmed.{" "}
          <Link href={back} className="underline underline-offset-4">See Plan &amp; billing</Link>
        </p>
      ) : accounts.length === 0 ? (
        <p className={`${card} mt-6 text-sm text-muted`}>Payment details will be added here soon. Contact Tavo support to buy a plan.</p>
      ) : (
        <section className={`${card} mt-6`}>
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl">1 · Send {rupees(info.pkr)} to</h2>
              <ul className="mt-4 grid gap-3">
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
              <p className="mt-3 text-xs text-muted">Keep the receipt. You&apos;ll need its transaction ID (TID) and a screenshot in step 2.</p>
            </div>
            <div>
              <h2 className="font-display text-2xl">2 · Tell us you paid</h2>
              <div className="mt-4">
                <ActionForm key={plan} action={submitPayment} submit={`Submit ${info.label} payment`}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="plan" value={plan} />
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
          <p className="mt-5 text-sm text-muted">We check each payment against our account, usually within a day. Your plan switches on as soon as it&apos;s confirmed.</p>
        </section>
      )}
    </div>
  );
}
