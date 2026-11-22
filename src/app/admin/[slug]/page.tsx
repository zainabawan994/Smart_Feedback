import Link from "next/link";
import { getStats, listDrafts } from "@/lib/store";
import { requireOwnerPage } from "@/lib/auth";
import { PageHeader, SENT, card, eyebrow, page, when } from "./ui";

export default async function Overview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { business: b } = await requireOwnerPage(slug);
  const [stats, drafts] = await Promise.all([getStats(slug), listDrafts(slug, 3)]);

  const c = stats.counts;
  const funnel = [
    { label: "QR scans", n: c.visit },
    { label: "Drafts", n: c.generate },
    { label: "Copied", n: c.copy },
    { label: "Opened Google", n: c.google },
  ];
  const top = Math.max(1, ...funnel.map((f) => f.n));
  const noQuestions = !(b.questions ?? []).length;
  const noGoogle = !b.googleReviewUrl || b.googleReviewUrl.includes("REPLACE_WITH");

  return (
    <div className={page}>
      <PageHeader eyebrow={`${b.name} · Dashboard`} title="How it's going" />

      {(noQuestions || noGoogle) && (
        <Link href={`/admin/${slug}/settings`} className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-mustard bg-card p-4 text-sm transition hover:border-ink">
          <span>
            <span className="font-medium">Finish setup:</span>{" "}
            {noQuestions ? "add the questions customers will answer" : "add your Google review link so customers land on your review box"}.
          </span>
          <span aria-hidden>→</span>
        </Link>
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

      {/* Latest drafts teaser */}
      <section className={`${card} mt-6`}>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Latest reviews</h2>
          <Link href={`/admin/${slug}/drafts`} className="text-sm underline decoration-line underline-offset-4 hover:decoration-ink">
            See all →
          </Link>
        </div>
        {drafts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Reviews customers write will show up here.</p>
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
