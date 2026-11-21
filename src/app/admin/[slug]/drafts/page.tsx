import Link from "next/link";
import { requireOwnerPage } from "@/lib/auth";
import { listDrafts, type Lang, type Sentiment } from "@/lib/store";
import { LANG_LABEL, PageHeader, SENT, page, when } from "../ui";

type Search = { mood?: string; lang?: string };

export default async function DraftsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Search> }) {
  const { slug } = await params;
  const { business } = await requireOwnerPage(slug);
  const q = await searchParams;
  const mood = SENT.some((s) => s.key === q.mood) ? (q.mood as Sentiment) : undefined;
  const lang = q.lang && q.lang in LANG_LABEL ? (q.lang as Lang) : undefined;

  const all = await listDrafts(slug, 300);
  const drafts = all.filter((d) => (!mood || d.sentiment === mood) && (!lang || d.lang === lang));

  // Filter links keep the other filter; clicking the active one clears it.
  const href = (next: Search) => {
    const p = new URLSearchParams(Object.entries({ mood, lang, ...next }).filter(([, v]) => v) as [string, string][]);
    return `/admin/${slug}/drafts${p.size ? `?${p}` : ""}`;
  };
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition ${active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`;

  return (
    <div className={page}>
      <PageHeader eyebrow={`${business.name} · Drafts`} title="What customers are saying">
        <p className="text-sm text-muted">
          <span className="font-mono text-ink">{drafts.length}</span> of {all.length} drafts
        </p>
      </PageHeader>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link href={href({ mood: undefined })} className={chip(!mood)}>
          All feelings
        </Link>
        {SENT.map((s) => (
          <Link key={s.key} href={href({ mood: mood === s.key ? undefined : s.key })} className={`${chip(mood === s.key)} flex items-center gap-2`}>
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </Link>
        ))}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
          <Link key={l} href={href({ lang: lang === l ? undefined : l })} className={`${chip(lang === l)} ${l === "ur" ? "urdu !leading-normal" : ""}`}>
            {LANG_LABEL[l]}
          </Link>
        ))}
      </div>

      {drafts.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center text-muted">
          {all.length === 0 ? "No drafts yet. They appear here as soon as a customer taps “Draft my review”." : "No drafts match these filters."}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {drafts.map((d) => {
            const s = SENT.find((x) => x.key === d.sentiment)!;
            const tags = [...d.items, ...d.occasions, ...(d.answers ?? []).map((x) => `${x.q}: ${x.a}`)];
            return (
              <li key={d.id} className="flex flex-col rounded-2xl border border-line bg-card p-5" style={{ borderTop: `3px solid ${s.color}` }}>
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.label} · <span className={d.lang === "ur" ? "urdu normal-case tracking-normal" : ""}>{LANG_LABEL[d.lang]}</span>
                  </span>
                  <span>{when(d.at)}</span>
                </div>
                <p dir={d.lang === "ur" ? "rtl" : "ltr"} className={`mt-3 flex-1 text-[16px] leading-relaxed ${d.lang === "ur" ? "urdu" : "font-display"}`}>
                  {d.text}
                </p>
                {(d.picks.length > 0 || tags.length > 0 || d.hasPhoto || d.hasNote) && (
                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3 text-xs">
                    {d.picks.map((p) => (
                      <span key={p} className="rounded-full bg-paper px-2.5 py-1">
                        {p}
                      </span>
                    ))}
                    {tags.map((t) => (
                      <span key={t} className="rounded-md border border-dashed border-line px-2 py-0.5 font-mono">
                        {t}
                      </span>
                    ))}
                    {d.hasPhoto && <span className="rounded-full bg-paper px-2.5 py-1">📷 photo</span>}
                    {d.hasNote && <span className="rounded-full bg-paper px-2.5 py-1">✍️ own words</span>}
                    {d.source === "template" && <span className="rounded-full px-2.5 py-1 text-muted">basic draft</span>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 max-w-2xl text-xs text-muted">
        These are the drafts customers saw. They can edit before posting, so the review on Google may differ. Only their choices and the draft text are kept: no photos, names or contact details.
      </p>
    </div>
  );
}
