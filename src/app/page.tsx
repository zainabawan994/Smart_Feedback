import Link from "next/link";

const STEPS = [
  ["Scan", "A QR card on the table opens a page. No app, no sign-up."],
  ["Select", "Customer taps how it went and up to three things that stood out."],
  ["Draft", "A language model writes a short draft from those picks only, then an open-source model tidies it into plain, everyday words."],
  ["Post", "They edit it, copy it, and post it on Google from their own account."],
];

const PROMISES = [
  ["Every feeling gets the Google button", "No hiding unhappy customers. Review gating breaks Google's rules and your customers' trust."],
  ["Nothing invented", "Drafts only use what the customer picked. No made-up dishes, names or praise."],
  ["The customer posts", "We never post for anyone. They read it, change it, and send it themselves."],
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-8">
      <nav className="flex items-center justify-between py-6">
        <span className="font-display text-xl tracking-tight">
          Smart<span className="text-tomato">Feedback</span>
        </span>
        <Link href="/admin/chai-khana" className="text-sm underline decoration-line underline-offset-4 hover:decoration-ink">
          Owner desk
        </Link>
      </nav>

      <section className="grid items-center gap-12 py-10 sm:py-16 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-tomato">For cafés & restaurants · English + اردو</p>
          <h1 className="mt-4 font-display text-[3.2rem] leading-[0.95] tracking-tight sm:text-[5.2rem]" style={{ fontVariationSettings: "'SOFT' 100, 'opsz' 144" }}>
            Real feedback.
            <br />
            <em className="text-tomato">Smarter</em> reviews.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted">
            Happy customers mean to leave a review, then never do. SmartFeedback turns three taps into a draft in their own voice, ready to post.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/r/chai-khana" className="rounded-full bg-tomato px-6 py-3.5 font-medium text-tomato-ink transition hover:brightness-110">
              Try it as a customer
            </Link>
            <Link href="/admin/chai-khana" className="rounded-full border border-ink px-6 py-3.5 font-medium transition hover:bg-ink hover:text-paper">
              See the owner desk
            </Link>
          </div>
        </div>

        {/* Mock ticket */}
        <div className="relative mx-auto w-full max-w-sm rotate-[1.5deg]">
          <div className="ticket rounded-t-2xl border-x border-t border-line p-6 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)]">
            <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              <span>Chai Khana · Lahore</span>
              <span>No. 214</span>
            </div>
            <div className="dashed my-4" />
            <div className="flex flex-wrap gap-2">
              {["Chai was strong and fresh", "Quick service", "Cozy seating"].map((c) => (
                <span key={c} className="rounded-full bg-ink px-3 py-1.5 text-sm text-paper">
                  {c}
                </span>
              ))}
              <span className="rounded-md bg-tomato px-2.5 py-1 font-mono text-xs text-tomato-ink">Bun kebab</span>
            </div>
            <div className="dashed my-4" />
            <p className="font-display text-[17px] leading-relaxed">
              Had a good time at Chai Khana. The bun kebab was good and the chai was strong and fresh. Service was quick and the seating is cozy. Would come back.
            </p>
            <p className="urdu mt-3 text-right text-muted" dir="rtl">
              چائے تازہ اور کڑک تھی۔
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
