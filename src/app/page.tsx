import Link from "next/link";
import { PLANS as PLAN_PRICES, rupees } from "@/lib/options";

const STEPS = [
  ["Scan", "A QR card at your counter or desk opens a page. No app, no sign-up."],
  ["Select", "Customer taps how it went and up to three things that stood out."],
  ["Draft", "A language model writes a short draft from those picks only, then an open-source model tidies it into plain, everyday words."],
  ["Post", "They edit it, copy it, and post it on Google from their own account."],
];

const PROMISES = [
  ["Every feeling gets the Google button", "No hiding unhappy customers. Review gating breaks Google's rules and your customers' trust."],
  ["Nothing invented", "Drafts only use what the customer picked. No made-up products, names or praise."],
  ["The customer posts", "We never post for anyone. They read it, change it, and send it themselves."],
];

// Every plan has every feature; longer terms just cost less per month.
const PLANS = [
  { key: "monthly", name: "Monthly", price: 12, period: "month", total: "Billed $12 every month", note: "Cancel any time" },
  { key: "6months", name: "6 Months", price: 60, period: "6 months", total: "$10 a month, billed $60 every 6 months", note: "Save 17%", popular: true },
  { key: "yearly", name: "Yearly", price: 96, period: "year", total: "$8 a month, billed $96 every year", note: "Save 33% · best value" },
];

const INCLUDED = [
  "Unlimited QR scans and review drafts",
  "English, Roman Urdu and اردو drafts",
  "Owner desk: overview, issues and drafts",
  "AI summary of complaints with fixes",
  "Printable QR card",
  "ESP32 feedback station support",
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-8">
      <nav className="flex items-center justify-between py-6">
        <span className="font-display text-xl tracking-tight">
          Smart<span className="text-tomato">Feedback</span>
        </span>
        <div className="flex items-center gap-3 text-sm sm:gap-5">
          <a href="#pricing" className="hidden underline decoration-line underline-offset-4 hover:decoration-ink sm:inline">
            Pricing
          </a>
          <Link href="/login" className="underline decoration-line underline-offset-4 hover:decoration-ink">
            Log in
          </Link>
        </div>
      </nav>

      <section className="grid items-center gap-12 py-10 sm:py-16 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-tomato">For every business · English + اردو</p>
          <h1 className="mt-4 font-display text-[3.2rem] leading-[0.95] tracking-tight sm:text-[5.2rem]" style={{ fontVariationSettings: "'SOFT' 100, 'opsz' 144" }}>
            Real feedback.
            <br />
            <em className="text-tomato">Smarter</em> reviews.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted">
            Happy customers mean to leave a review, then never do. SmartFeedback turns three taps into a draft in their own voice, ready to post.
          </p>
        </div>

        {/* Mock ticket */}
        <div className="relative mx-auto w-full max-w-sm rotate-[1.5deg]">
          <div className="ticket rounded-t-2xl border-x border-t border-line p-6 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)]">
            <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              <span>Your Business · Lahore</span>
              <span>No. 214</span>
            </div>
            <div className="dashed my-4" />
            <div className="flex flex-wrap gap-2">
              {["Friendly staff", "Quick service", "Fair prices"].map((c) => (
                <span key={c} className="rounded-full bg-ink px-3 py-1.5 text-sm text-paper">
                  {c}
                </span>
              ))}
              <span className="rounded-md bg-tomato px-2.5 py-1 font-mono text-xs text-tomato-ink">Great quality</span>
            </div>
            <div className="dashed my-4" />
            <p className="font-display text-[17px] leading-relaxed">
              Had a good experience here. The staff were friendly, service was quick and the prices were fair. Great quality too. Would come back.
            </p>
            <p className="urdu mt-3 text-right text-muted" dir="rtl">
              عملہ بہت اچھا تھا۔
            </p>
          </div>
          <span className="absolute -left-4 -top-4 -rotate-12 rounded-full bg-mustard px-3 py-1 font-mono text-xs font-medium text-ink">3 taps</span>
        </div>
      </section>

      <section className="border-t border-ink py-14">
        <h2 className="font-display text-3xl tracking-tight sm:text-4xl">How it works</h2>
        <ol className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="bg-card p-6">
              <span className="font-mono text-sm text-tomato">0{i + 1}</span>
              <h3 className="mt-3 font-display text-2xl">{t}</h3>
              <p className="mt-2 text-[15px] text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="scroll-mt-6 border-t border-ink py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">Plans for your business</h2>
            <p className="mt-2 max-w-xl text-muted">One location per plan, every feature included. Pick how long you want to pay for; longer plans cost less each month.</p>
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Prices in USD</p>
        </div>

        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <li key={p.name} className={`relative flex flex-col rounded-2xl border bg-card p-6 ${p.popular ? "border-tomato shadow-[0_20px_40px_-25px_rgb(0_0_0/0.35)]" : "border-line"}`}>
              {p.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-tomato px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-tomato-ink">Most popular</span>
              )}
              <h3 className="font-display text-2xl">{p.name}</h3>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-5xl tabular-nums">${p.price}</span>
                <span className="text-muted">/ {p.period}</span>
              </p>
              <p className="mt-2 text-sm text-muted">{p.total}</p>
              <p className="mt-1 text-sm text-muted">In Pakistan: {rupees(PLAN_PRICES.find((x) => x.key === p.key)!.pkr)} by bank transfer, Easypaisa or JazzCash</p>
              <p className={`mt-3 w-fit rounded-full px-2.5 py-0.5 font-mono text-[11px] ${p.popular ? "bg-mustard text-ink" : "border border-line text-muted"}`}>{p.note}</p>
              <div className="dashed my-5" />
              <ul className="grid gap-2 text-[15px]">
                {INCLUDED.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span aria-hidden className="text-leaf">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-muted">
          Accounts are set up by the SmartFeedback admin. Already have one?{" "}
          <Link href="/login" className="text-ink underline underline-offset-4">
            Log in
          </Link>{" "}
          and pick a plan from your Account page.
        </p>
      </section>

      <section className="grid gap-10 border-t border-ink py-14 lg:grid-cols-[1fr_2fr]">
        <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
          What we <em>won&apos;t</em> do
        </h2>
        <ul className="divide-y divide-line">
          {PROMISES.map(([t, d]) => (
            <li key={t} className="grid gap-1 py-5 sm:grid-cols-[1fr_1.4fr] sm:gap-6">
              <span className="font-medium">{t}</span>
              <span className="text-muted">{d}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="flex flex-wrap justify-between gap-2 border-t border-line py-8 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        <span>SmartFeedback prototype</span>
        <span>Next.js · open-source LLM normalizer</span>
      </footer>
    </main>
  );
}
