import { requireOwnerPage } from "@/lib/auth";
import { getInsight, listDrafts } from "@/lib/store";
import { analyze, type Issue } from "@/lib/insights.ts";
import { PageHeader, card, eyebrow, page, when } from "../ui";
import AnalyzeButton from "./AnalyzeButton";

const TREND: Record<Issue["trend"], { text: string; cls: string }> = {
  rising: { text: "↑ rising", cls: "text-plum" },
  new: { text: "● new this week", cls: "text-plum" },
  falling: { text: "↓ falling", cls: "text-leaf" },
  steady: { text: "→ steady", cls: "text-muted" },
};

function Severity({ s }: { s: "major" | "minor" }) {
  return s === "major" ? (
    <span className="rounded-full bg-plum px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper">Major</span>
  ) : (
    <span className="rounded-full border border-mustard px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink">Minor</span>
  );
}

export default async function IssuesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { business, readOnly } = await requireOwnerPage(slug);
  const [drafts, insight] = await Promise.all([listDrafts(slug, 500), getInsight(slug)]);
  const a = analyze(drafts);
  const majors = a.issues.filter((i) => i.severity === "major");
  const newSince = insight ? Math.max(0, a.total - insight.draftCount) : 0;

  return (
    <div className={page}>
      <PageHeader eyebrow={`${business.name} · Issues`} title="What needs fixing" />

      {/* Headline numbers */}
      <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4" aria-label="Summary">
        {[
          { k: "Major problems", v: majors.length, cls: majors.length ? "text-plum" : "" },
          { k: "Minor problems", v: a.issues.length - majors.length, cls: "" },
          { k: "Unhappy visits", v: a.total ? `${Math.round((a.unhappy / a.total) * 100)}%` : "–", cls: "" },
          { k: "Drafts analyzed", v: a.total, cls: "" },
        ].map((x) => (
          <div key={x.k} className="bg-card p-5">
            <p className={eyebrow}>{x.k}</p>
            <p className={`mt-2 font-display text-4xl tabular-nums ${x.cls}`}>{x.v}</p>
          </div>
        ))}
      </section>

      {/* AI read */}
      <section className={`${card} mt-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">AI summary</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              The open-source model reads your whole feedback history, groups similar complaints and suggests one fix for each. Numbers come from your real drafts.
            </p>
          </div>
          {a.unhappy > 0 && !readOnly && <AnalyzeButton slug={slug} label={insight ? "Re-analyze" : "Analyze with AI"} />}
        </div>

        {!insight ? (
          <p className="mt-5 rounded-xl border border-dashed border-line p-5 text-sm text-muted">
            {a.unhappy > 0 ? "Not analyzed yet. The counted problems below are already up to date." : "No complaints yet, so there's nothing for the AI to analyze."}
          </p>
        ) : (
          <>
            {insight.summary && <p className="mt-5 font-display text-lg leading-relaxed">{insight.summary}</p>}
            <ol className="mt-5 grid gap-3">
              {insight.issues.map((i, n) => (
                <li key={n} className="grid gap-2 rounded-xl border border-line bg-paper p-4 sm:grid-cols-[1fr_1.1fr] sm:gap-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Severity s={i.severity} />
                      <span className="font-mono text-xs text-muted">{i.mentions} mentions</span>
                    </div>
                    <p className="mt-2 font-medium">{i.title}</p>
                    <p className="mt-1 text-sm text-muted">{i.why}</p>
                  </div>
                  <p className="self-center rounded-lg bg-card px-3 py-2 text-sm">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-leaf">Try this week</span>
                    <br />
                    {i.fix}
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-muted">
              Analyzed {when(insight.at)} from {insight.draftCount} drafts
              {newSince > 0 && (
                <>
                  {" "}· <span className="font-medium text-ink">{newSince} new since then</span>, re-analyze to include them
                </>
              )}
              . AI suggestions can be wrong; check them against the counts below.
            </p>
          </>
        )}
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Counted problems */}
        <section>
          <h2 className="font-display text-2xl">Every complaint, counted</h2>
          <p className="mt-1 text-sm text-muted">From what unhappy customers picked. Major = 3+ “Not great” mentions making up a quarter of unhappy visits, or a sudden jump this week. “It was okay” picks are never major.</p>
          {a.issues.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-line p-8 text-center text-muted">No complaints so far. Keep the QR cards on the tables.</p>
          ) : (
            <ul className="mt-5 grid gap-3">
              {a.issues.map((i) => (
                <li key={i.label} className={`${card} ${i.severity === "major" ? "border-plum/50" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Severity s={i.severity} />
                        <span className={`text-xs ${TREND[i.trend].cls}`}>{TREND[i.trend].text}</span>
                      </div>
                      <h3 className="mt-2 font-display text-xl">{i.label}</h3>
                    </div>
                    <p className="text-right">
                      <span className="font-display text-3xl tabular-nums">{i.count}</span>
                      <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">mentions</span>
                    </p>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-paper" title={`${Math.round(i.share * 100)}% of unhappy visits`}>
                    <div className={`h-full rounded-full ${i.severity === "major" ? "bg-plum" : "bg-mustard"}`} style={{ width: `${Math.round(i.share * 100)}%` }} />
                  </div>
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>{Math.round(i.share * 100)}% of unhappy visits</span>
                    <span>
                      This week {i.last7} · week before {i.prev7}
                    </span>
                    {i.dishes.length > 0 && <span>Often with: {i.dishes.join(", ")}</span>}
                    {i.occasions.length > 0 && <span>Mostly at: {i.occasions.join(", ")}</span>}
                  </p>
                  {i.examples.length > 0 && (
                    <details className="group mt-3">
                      <summary className="cursor-pointer text-sm underline decoration-line underline-offset-4 hover:decoration-ink">What customers said</summary>
                      <ul className="mt-2 grid gap-2">
                        {i.examples.map((ex, n) => (
                          <li key={n} dir={ex.lang === "ur" ? "rtl" : "ltr"} className={`rounded-lg bg-paper px-3 py-2 text-sm ${ex.lang === "ur" ? "urdu" : "font-display"}`}>
                            “{ex.text}” <span className="font-sans text-xs text-muted">· {when(ex.at)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Strengths */}
        <aside className={card}>
          <h2 className="font-display text-xl">What customers love</h2>
          <p className="mt-1 text-xs text-muted">Keep doing these.</p>
          {a.praise.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No praise picked yet.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {a.praise.map((p) => (
                <li key={p.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-leaf" />
                    {p.label}
                  </span>
                  <span className="font-mono text-muted">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
