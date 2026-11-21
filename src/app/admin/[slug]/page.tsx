import Link from "next/link";
import { getStats, listDrafts } from "@/lib/store";
import { requireOwnerPage } from "@/lib/auth";
import { analyze } from "@/lib/insights.ts";
import { LANG_LABEL, PageHeader, SENT, card, eyebrow, page, when } from "./ui";

const SIGNALS = [
  { key: "dish", label: "Names a dish", hint: "Matches searches like “best bun kebab near me”" },
  { key: "occasion", label: "Says the occasion", hint: "Matches “family breakfast spot” style questions" },
  { key: "photo", label: "Has a photo", hint: "Remind customers to attach it on Google too" },
  { key: "note", label: "Own words added", hint: "Personal detail makes reviews more trusted" },
];
const EVENT_LABEL = { visit: "Scanned the QR", generate: "Drafted a review", copy: "Copied review", google: "Opened Google", tap: "Tapped the station" };

export default async function Overview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { business: b } = await requireOwnerPage(slug);
  const [stats, history] = await Promise.all([getStats(slug), listDrafts(slug, 500)]);
  const drafts = history.slice(0, 3);
  const problems = analyze(history).issues.slice(0, 3);

  const c = stats.counts;
  const funnel = [
    { label: "QR scans", n: c.visit },
    { label: "Drafts", n: c.generate },
    { label: "Copied", n: c.copy },
    { label: "Opened Google", n: c.google },
  ];
  const top = Math.max(1, ...funnel.map((f) => f.n));
  const sentTotal = Math.max(1, SENT.reduce((s, x) => s + stats.sentiment[x.key], 0));
  const dayTop = Math.max(1, ...stats.daily.map((d) => d.visits));
  const rate = c.visit ? Math.round((c.google / c.visit) * 100) : 0;
  const setupMissing = !b.googleReviewUrl || b.googleReviewUrl.includes("REPLACE_WITH") || b.menu.length === 0;

  return (
    <div className={page}>
      <PageHeader eyebrow={`${b.name} · Overview`} title="How it's going" />

      {setupMissing && (
        <Link href={`/admin/${slug}/settings`} className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-mustard bg-card p-4 text-sm transition hover:border-ink">
          <span>
            <span className="font-medium">Finish setup:</span>{" "}
            {!b.googleReviewUrl || b.googleReviewUrl.includes("REPLACE_WITH") ? "add your real Google review link" : "add your menu items"} so drafts can name your dishes.
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      {problems.length > 0 && (
        <section className={`${card} mt-6`} aria-label="Top problems">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">Top problems</h2>
            <Link href={`/admin/${slug}/issues`} className="text-sm underline decoration-line underline-offset-4 hover:decoration-ink">
              All issues & AI summary →
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {problems.map((p) => (
              <li key={p.label} className={`rounded-xl border bg-paper p-4 ${p.severity === "major" ? "border-plum/50" : "border-line"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${p.severity === "major" ? "bg-plum text-paper" : "border border-mustard"}`}>
                    {p.severity}
                  </span>
                  <span className="font-mono text-xs text-muted">{p.count}× · {p.last7} this week</span>
                </div>
                <p className="mt-2 font-display text-lg">{p.label}</p>
                {p.dishes.length > 0 && <p className="mt-1 text-xs text-muted">Often with {p.dishes.join(", ")}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-line bg-line grid-cols-2 lg:grid-cols-4" aria-label="Totals">
        {funnel.map((f, i) => (
          <div key={f.label} className="bg-card p-5">
            <p className={eyebrow}>{f.label}</p>
            <p className="mt-2 font-display text-4xl tabular-nums sm:text-5xl">{f.n}</p>
            <div className="mt-4 h-1.5 rounded-full bg-paper">
              <div className="h-full rounded-full" style={{ width: `${(f.n / top) * 100}%`, background: i === 3 ? "var(--tomato)" : "var(--ink)" }} />
            </div>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Feelings + trend */}
        <section className={`${card} lg:col-span-3`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">How people felt</h2>
            <p className="text-sm text-muted">
              <span className="font-mono text-ink">{rate}%</span> of scans reached Google
            </p>
          </div>
          <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-paper">
            {SENT.map((s) => (
              <div key={s.key} style={{ width: `${(stats.sentiment[s.key] / sentTotal) * 100}%`, background: s.color }} title={`${s.label}: ${stats.sentiment[s.key]}`} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {SENT.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                {s.label} <span className="font-mono text-muted">{stats.sentiment[s.key]}</span>
              </li>
            ))}
          </ul>

          <div className="dashed my-5" />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className={eyebrow}>Last 14 days</h3>
            <span className="flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-line" />
                Scans
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-tomato" />
                Opened Google
              </span>
            </span>
          </div>
          <div className="mt-3 flex h-32 items-end gap-1.5" role="img" aria-label={`Scans per day, last 14 days: ${stats.daily.map((d) => d.visits).join(", ")}`}>
            {stats.daily.map((d) => (
              <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.visits} scans, ${d.google} to Google`}>
                <div className="relative w-full rounded-t bg-line" style={{ height: `${(d.visits / dayTop) * 100}%`, minHeight: 2 }}>
                  <div className="absolute inset-x-0 bottom-0 rounded-t bg-tomato" style={{ height: d.visits ? `${(d.google / d.visits) * 100}%` : 0 }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted">
            <span>{stats.daily[0].day.slice(5)}</span>
            <span>today</span>
          </div>
        </section>

        {/* Activity */}
        <section className={`${card} lg:col-span-2`}>
          <h2 className="font-display text-2xl">Activity</h2>
          {stats.recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Nothing yet.{" "}
              <Link href={`/admin/${slug}/qr`} className="text-ink underline underline-offset-4">
                Print your QR card
              </Link>{" "}
              and put it on a table.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {stats.recent.slice(0, 9).map((e, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: e.sentiment ? SENT.find((s) => s.key === e.sentiment)!.color : "var(--line)" }} />
                    {EVENT_LABEL[e.type]}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted">{when(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {c.tap > 0 && (
        <section className={`${card} mt-6`} aria-label="Feedback station">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">Feedback station</h2>
            <p className="text-sm text-muted">
              <span className="font-mono text-ink">{c.tap}</span> button presses
            </p>
          </div>
          <ul className="mt-4 grid grid-cols-3 gap-3">
            {SENT.map((s) => (
              <li key={s.key} className="rounded-xl border border-line bg-paper p-4">
                <span className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <p className="mt-2 font-display text-3xl tabular-nums">{stats.station[s.key]}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Search signals */}
      <section className={`${card} mt-6`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl">Search signals</h2>
          <p className="text-sm text-muted">Share of drafts that carry each detail</p>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Google Maps and AI assistants like ChatGPT and Gemini pick places from reviews that name the dish, the occasion and the city. These come from what customers choose, never from forced keywords.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SIGNALS.map((s) => {
            const pct = c.generate ? Math.round(((stats.signals[s.key] ?? 0) / c.generate) * 100) : 0;
            return (
              <div key={s.key}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="font-mono text-sm tabular-nums">{pct}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-paper">
                  <div className="h-full rounded-full bg-leaf" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted">{s.hint}</p>
              </div>
            );
          })}
        </div>
        <div className="dashed my-5" />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className={eyebrow}>Languages</span>
          {(Object.keys(LANG_LABEL) as (keyof typeof LANG_LABEL)[]).map((k) => (
            <span key={k} className={k === "ur" ? "urdu leading-normal" : ""}>
              {LANG_LABEL[k]} <span className="font-mono text-muted">{stats.signals[`lang:${k}`] ?? 0}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Latest drafts teaser */}
      <section className={`${card} mt-6`}>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Latest drafts</h2>
          <Link href={`/admin/${slug}/drafts`} className="text-sm underline decoration-line underline-offset-4 hover:decoration-ink">
            See all →
          </Link>
        </div>
        {drafts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Drafts customers make will show up here.</p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-3">
            {drafts.map((d) => (
              <li key={d.id} className="rounded-xl border border-line bg-paper p-3">
                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: SENT.find((s) => s.key === d.sentiment)!.color }} />
                  {when(d.at)}
                </p>
                <p dir={d.lang === "ur" ? "rtl" : "ltr"} className={`mt-2 line-clamp-4 text-sm ${d.lang === "ur" ? "urdu" : "font-display"}`}>
                  {d.text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
