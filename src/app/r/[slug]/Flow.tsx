"use client";

import { useEffect, useRef, useState } from "react";
import type { Business, Lang, Sentiment } from "@/lib/store";
import { LANGS, NOTE_MAX, googleLink } from "@/lib/options";
import { typeOf } from "@/lib/business-types";
import { useDraft } from "@/components/forms";

const FEELINGS: { key: Sentiment; label: string; ur: string; color: string; mouth: string }[] = [
  { key: "positive", label: "Loved it", ur: "بہت اچھا", color: "var(--leaf)", mouth: "M14 27 Q22 35 30 27" },
  { key: "neutral", label: "It was okay", ur: "ٹھیک تھا", color: "var(--mustard)", mouth: "M14 29 L30 29" },
  { key: "negative", label: "Not great", ur: "اچھا نہیں", color: "var(--plum)", mouth: "M14 32 Q22 24 30 32" },
];

function Face({ mouth, color }: { mouth: string; color: string }) {
  return (
    <svg viewBox="0 0 44 44" className="h-10 w-10" aria-hidden>
      <circle cx="22" cy="22" r="20" fill="none" stroke={color} strokeWidth="2.5" />
      <circle cx="16" cy="18" r="2" fill={color} />
      <circle cx="28" cy="18" r="2" fill={color} />
      <path d={mouth} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const post = (url: string, body: object) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function Question({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rise mt-8">
      <h2 className="flex items-baseline gap-2 text-lg font-semibold">
        <span className="font-mono text-sm text-tomato">{n}</span>
        {title}
        {hint && <span className="text-sm font-normal text-muted">{hint}</span>}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** One screen, up to four quick questions, then the AI review appears right below. */
export default function Flow({ business: b }: { business: Business }) {
  const type = typeOf(b.kind); // what "items" means for this kind of business
  const [sentiment, setSentiment] = useDraft<Sentiment | null>(`review:${b.slug}:sentiment`, null);
  const [picks, setPicks] = useDraft<string[]>(`review:${b.slug}:picks`, []);
  const [items, setItems] = useDraft<string[]>(`review:${b.slug}:items`, []);
  const [note, setNote] = useDraft(`review:${b.slug}:note`, "");
  const [answers, setAnswers] = useDraft<Record<string, string>>(`review:${b.slug}:answers`, {}); // owner's own questions: title → chosen answer
  const [lang, setLang] = useDraft<Lang>(`review:${b.slug}:lang`, b.defaultLang);
  const [draft, setDraft] = useDraft(`review:${b.slug}:draft`, "");
  const [aiBusy, setAiBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    post("/api/event", { slug: b.slug, type: "visit" });
  }, [b.slug]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string, max: number) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : list.length < max ? [...list, v] : list);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await post("/api/generate", { slug: b.slug, sentiment, picks, items, note, lang, answers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      setDraft(json.text);
      setAiBusy(Boolean(json.aiBusy));
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    post("/api/event", { slug: b.slug, type: "copy" });
    setTimeout(() => setCopied(false), 2500);
  }

  const rtl = lang === "ur";
  const questions = b.questions ?? [];
  const ready = Boolean(sentiment) && (picks.length > 0 || Object.keys(answers).length > 0 || note.trim().length > 0);
  let n = 1; // question numbers follow what is actually shown
  const chip = (on: boolean) =>
    `rounded-full border px-4 py-2.5 text-base transition disabled:opacity-35 ${on ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink"}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-24 pt-6 text-[17px]">
      <header className="flex items-center justify-between gap-3">
        <span className="min-w-0 font-mono text-xs uppercase leading-snug tracking-[0.14em] text-muted">
          {b.name}
          <span className="block">{b.city}</span>
        </span>
        <div className="flex shrink-0 rounded-full border border-line p-0.5" role="radiogroup" aria-label="Review language">
          {LANGS.map((l) => (
            <button
              key={l.key}
              role="radio"
              aria-checked={lang === l.key}
              onClick={() => setLang(l.key)}
              className={`rounded-full px-2.5 py-1 text-sm ${lang === l.key ? "bg-ink text-paper" : "text-muted"} ${l.key === "ur" ? "urdu !leading-normal" : ""}`}
            >
              {l.key === "roman" ? "Roman" : l.label}
            </button>
          ))}
        </div>
      </header>

      <h1 className="mt-6 font-display text-[2.1rem] leading-[1.08] tracking-tight" style={{ fontVariationSettings: "'SOFT' 100" }}>
        How was your visit to <em className="text-tomato">{b.name}</em>?
      </h1>
      <p className="mt-2 text-base text-muted">Answer a few taps and we&apos;ll write your review. Honest feedback of every kind is welcome.</p>

      {/* 1 · Feeling */}
      <div className="mt-6 grid grid-cols-3 gap-2" role="radiogroup" aria-label="How was it">
        {FEELINGS.map((f) => {
          const on = sentiment === f.key;
          return (
            <button
              key={f.key}
              role="radio"
              aria-checked={on}
              onClick={() => {
                if (sentiment !== f.key) setPicks([]); // each feeling has its own options
                setSentiment(f.key);
              }}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 transition ${on ? "bg-card" : "border-line bg-card/60 hover:border-ink"}`}
              style={on ? { borderColor: f.color } : undefined}
            >
              <Face mouth={f.mouth} color={f.color} />
              <span className="text-[15px] font-medium leading-tight">{f.label}</span>
              <span className="urdu text-sm leading-normal text-muted">{f.ur}</span>
            </button>
          );
        })}
      </div>

      {sentiment && (
        <>
          {/* 2 · What stood out */}
          {questions.map((q) => (
            <Question key={q.title} n={++n} title={q.title}>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o) => {
                  const on = answers[q.title] === o;
                  return (
                    <button
                      key={o}
                      aria-pressed={on}
                      onClick={() => {
                        const next = { ...answers };
                        if (on) delete next[q.title]; // tap again to clear
                        else next[q.title] = o;
                        setAnswers(next);
                      }}
                      className={chip(on)}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </Question>
          ))}

          <Question n={++n} title="What stood out?" hint={`pick up to 3 · ${picks.length}/3`}>
            <div className="flex flex-wrap gap-2">
              {b.highlights[sentiment].map((h) => {
                const on = picks.includes(h);
                return (
                  <button key={h} aria-pressed={on} onClick={() => toggle(picks, setPicks, h, 3)} disabled={!on && picks.length >= 3} className={chip(on)}>
                    {h}
                  </button>
                );
              })}
            </div>
          </Question>

          {/* 3 · Items (only if the owner listed some) */}
          {b.menu.length > 0 && (
            <Question n={++n} title={type.items.question} hint="optional">
              <div className="flex flex-wrap gap-2">
                {b.menu.map((m) => {
                  const on = items.includes(m);
                  return (
                    <button key={m} aria-pressed={on} onClick={() => toggle(items, setItems, m, 3)} className={chip(on)}>
                      {m}
                    </button>
                  );
                })}
              </div>
            </Question>
          )}

          {/* 4 · Own words */}
          <Question n={++n} title="Anything else?" hint="optional">
            <textarea
              aria-label="Anything else"
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="A few words in English, Urdu or Roman Urdu"
              className="w-full resize-none rounded-xl border border-line bg-card px-3.5 py-3 text-base outline-none transition placeholder:text-muted/70 focus:border-ink"
            />
          </Question>

          {error && <p className="mt-4 text-base text-plum">{error}</p>}

          <button
            onClick={generate}
            disabled={!ready || busy}
            className="mt-6 w-full rounded-full bg-tomato px-5 py-4 text-lg font-semibold text-tomato-ink transition hover:brightness-110 disabled:opacity-40"
          >
            {busy ? "Writing your review…" : draft ? "Write it again" : "Continue"}
          </button>
          {!ready && <p className="mt-2 text-center text-sm text-muted">Answer at least one question above.</p>}
        </>
      )}

      {/* Result, on the same screen */}
      {draft && (
        <section ref={resultRef} className="rise mt-10 scroll-mt-4" aria-label="Your review">
          <h2 className="font-display text-2xl">Your review</h2>
          <p className="mt-1 text-base text-muted">Change anything that doesn&apos;t sound like you, then post it.</p>
          {aiBusy && (
            <p className="mt-3 rounded-xl border border-mustard px-3 py-2 text-base" role="status">
              The AI is busy right now, so this is a simpler version. Tap <span className="font-medium">Write it again</span> in a minute.
            </p>
          )}
          <textarea
            aria-label="Your review text"
            dir={rtl ? "rtl" : "ltr"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className={`mt-4 w-full resize-none rounded-2xl border border-line bg-card p-4 text-lg leading-relaxed outline-none focus:border-ink ${rtl ? "urdu" : "font-display"}`}
          />
          <div className="mt-4 grid gap-3">
            <button onClick={copy} className="rounded-full bg-tomato px-5 py-4 text-lg font-semibold text-tomato-ink transition hover:brightness-110">
              {copied ? "Copied ✓ now paste it on Google" : "1 · Copy review"}
            </button>
            <a
              href={googleLink(b)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => post("/api/event", { slug: b.slug, type: "google" })}
              className="rounded-full border-2 border-ink px-5 py-4 text-center text-lg font-semibold transition hover:bg-ink hover:text-paper"
            >
              2 · Open Google reviews ↗
            </a>
          </div>
          <p className="mt-6 text-sm text-muted">You post it yourself, from your own account. Nothing is posted for you.</p>
        </section>
      )}

      <footer className="mt-auto pt-12 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">SmartFeedback · Real feedback. Smarter reviews.</footer>
    </main>
  );
}
