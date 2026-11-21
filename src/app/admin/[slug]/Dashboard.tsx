"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import type { Business, Sentiment, Stats } from "@/lib/store";

const SENT: { key: Sentiment; label: string; color: string }[] = [
  { key: "positive", label: "Loved it", color: "var(--leaf)" },
  { key: "neutral", label: "Okay", color: "var(--mustard)" },
  { key: "negative", label: "Not great", color: "var(--plum)" },
];

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const ago = (iso: string) => {
  const m = Math.round((Date.now() - +new Date(iso)) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};
const EVENT_LABEL = { visit: "Scanned the QR", generate: "Drafted a review", copy: "Copied review", google: "Opened Google" };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
const input = "w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-[15px] outline-none transition focus:border-ink";

export default function Dashboard({ initial, stats }: { initial: Business; stats: Stats }) {
  const [b, setB] = useState(initial);
  const [menu, setMenu] = useState(initial.menu.join("\n"));
  const [hl, setHl] = useState({
    positive: initial.highlights.positive.join("\n"),
    neutral: initial.highlights.neutral.join("\n"),
    negative: initial.highlights.negative.join("\n"),
  });
  const [status, setStatus] = useState("");
  const [url, setUrl] = useState("");
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => setUrl(`${window.location.origin}/r/${b.slug}`), [b.slug]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Saving…");
    const res = await fetch(`/api/business/${b.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...b, menu: lines(menu), highlights: { positive: lines(hl.positive), neutral: lines(hl.neutral), negative: lines(hl.negative) } }),
    });
    const json = await res.json();
    if (res.ok) setB(json.business);
    setStatus(res.ok ? "Saved" : json.error);
    setTimeout(() => setStatus(""), 2500);
  }

  function downloadQR() {
    const a = document.createElement("a");
    a.href = qrRef.current!.toDataURL("image/png");
    a.download = `${b.slug}-review-qr.png`;
    a.click();
  }

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">SmartFeedback · Owner desk</p>
          <h1 className="mt-1 font-display text-4xl tracking-tight sm:text-5xl">{b.name}</h1>
        </div>
        <a href={`/r/${b.slug}`} target="_blank" className="rounded-full border border-ink px-4 py-2 text-sm transition hover:bg-ink hover:text-paper">
          Customer page ↗
        </a>
      </header>

      {/* Numbers */}
      <section className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4" aria-label="Totals">
        {funnel.map((f, i) => (
          <div key={f.label} className="bg-card p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{f.label}</p>
            <p className="mt-2 font-display text-5xl tabular-nums">{f.n}</p>
            <div className="mt-4 h-1.5 rounded-full bg-paper">
              <div className="h-full rounded-full" style={{ width: `${(f.n / top) * 100}%`, background: i === 3 ? "var(--tomato)" : "var(--ink)" }} />
            </div>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-line bg-card p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between">
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
          <p className="mt-4 text-xs text-muted">Every feeling gets the same Google button. Filtering out unhappy customers (&quot;review gating&quot;) breaks Google&apos;s rules.</p>

          <div className="dashed my-5" />
          <div className="flex items-baseline justify-between">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Last 14 days</h3>
            <span className="flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-line" />Scans</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-tomato" />Opened Google</span>
            </span>
          </div>
          <div className="mt-3 flex h-28 items-end gap-1.5" role="img" aria-label={`Scans per day, last 14 days: ${stats.daily.map((d) => d.visits).join(", ")}`}>
            {stats.daily.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.visits} scans, ${d.google} to Google`}>
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

          <div className="dashed my-5" />
          <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Recent</h3>
          {stats.recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing yet. Print the QR and put it on a table.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {stats.recent.slice(0, 8).map((e, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.sentiment ? SENT.find((s) => s.key === e.sentiment)!.color : "var(--line)" }} />
                    {EVENT_LABEL[e.type]}
                  </span>
                  <span className="font-mono text-xs text-muted">{ago(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* QR table tent */}
        <section className="flex flex-col items-center rounded-2xl border border-line bg-ink p-6 text-paper">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-60">Table card</p>
          <div className="ticket mt-4 w-full max-w-[15rem] rounded-t-xl p-5 text-center text-ink">
            <p className="font-display text-xl leading-tight">How was {b.name}?</p>
            <div className="mx-auto mt-4 w-fit rounded-lg bg-white p-2.5">
              {url && <QRCodeCanvas ref={qrRef} value={url} size={150} fgColor="#1c1a16" level="M" marginSize={0} />}
            </div>
            <p className="mt-3 text-sm">Scan · tap three things · done</p>
            <p className="urdu mt-1 text-sm text-muted">اسکین کریں، تین چیزیں چنیں</p>
          </div>
          <button onClick={downloadQR} className="mt-6 w-full rounded-full bg-tomato px-4 py-3 font-medium text-tomato-ink transition hover:brightness-110">
            Download QR (PNG)
          </button>
          <p className="mt-3 break-all text-center font-mono text-[11px] opacity-60">{url}</p>
        </section>
      </div>

      {/* Settings */}
      <form onSubmit={save} className="mt-6 rounded-2xl border border-line bg-card p-5 sm:p-7">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl">Profile & options</h2>
          <span className="font-mono text-xs text-muted" role="status">
            {status}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <input className={input} value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} required />
          </Field>
          <Field label="City">
            <input className={input} value={b.city} onChange={(e) => setB({ ...b, city: e.target.value })} />
          </Field>
          <Field label="Google review link" hint="from Business Profile → Ask for reviews">
            <input className={input} type="url" value={b.googleReviewUrl} onChange={(e) => setB({ ...b, googleReviewUrl: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <input className={input} value={b.kind} onChange={(e) => setB({ ...b, kind: e.target.value })} />
            </Field>
            <Field label="Default language">
              <select className={input} value={b.defaultLang} onChange={(e) => setB({ ...b, defaultLang: e.target.value as Business["defaultLang"] })}>
                <option value="en">English</option>
                <option value="ur">اردو</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="dashed my-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Menu items" hint="one per line">
            <textarea className={`${input} font-mono text-sm`} rows={8} value={menu} onChange={(e) => setMenu(e.target.value)} />
          </Field>
          {SENT.map((s) => (
            <Field key={s.key} label={`Options · ${s.label}`} hint="one per line">
              <textarea
                className={`${input} text-sm`}
                style={{ borderLeft: `3px solid ${s.color}` }}
                rows={8}
                value={hl[s.key]}
                onChange={(e) => setHl({ ...hl, [s.key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Customers choose what to mention. Don&apos;t add options that tell them what to say about you; Google treats scripted content as a policy issue.</p>

        <button className="mt-6 rounded-full bg-ink px-6 py-3 font-medium text-paper transition hover:opacity-90">Save changes</button>
      </form>
    </div>
  );
}
