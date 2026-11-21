"use client";

import { useEffect, useState } from "react";
import type { Business, Lang, Sentiment } from "@/lib/store";
import { LANGS, NOTE_MAX, googleLink } from "@/lib/options";
import { typeOf } from "@/lib/business-types";
import { shrinkImage } from "@/lib/image";

const FEELINGS: { key: Sentiment; label: string; ur: string; color: string; mouth: string }[] = [
  { key: "positive", label: "Loved it", ur: "بہت اچھا", color: "var(--leaf)", mouth: "M14 27 Q22 35 30 27" },
  { key: "neutral", label: "It was okay", ur: "ٹھیک تھا", color: "var(--mustard)", mouth: "M14 29 L30 29" },
  { key: "negative", label: "Not great", ur: "اچھا نہیں", color: "var(--plum)", mouth: "M14 32 Q22 24 30 32" },
];

function Face({ mouth, color }: { mouth: string; color: string }) {
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11" aria-hidden>
      <circle cx="22" cy="22" r="20" fill="none" stroke={color} strokeWidth="2.5" />
      <circle cx="16" cy="18" r="2" fill={color} />
      <circle cx="28" cy="18" r="2" fill={color} />
      <path d={mouth} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const post = (url: string, body: object) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Phone photos are 3-10 MB; shrink to ≤640px JPEG (~60 KB). Enough to recognise food, and far fewer model tokens (Groq free tier: 7k tokens/min). */
async function shrinkPhoto(file: File) {
  return shrinkImage(file, 640);
}

export default function Flow({ business: b, ticketNo }: { business: Business; ticketNo: string }) {
  const type = typeOf(b.kind); // questions, items and occasions for this kind of business
  const [step, setStep] = useState(0);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [picks, setPicks] = useState<string[]>([]);
  const [items, setItems] = useState<string[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>(b.defaultLang);
  const [draft, setDraft] = useState("");
  const [meta, setMeta] = useState<{ source: string; normalizedBy: string; photoSeen?: string; photo?: string; aiBusy?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    post("/api/event", { slug: b.slug, type: "visit" });
  }, [b.slug]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string, max: number) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : list.length < max ? [...list, v] : list);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await post("/api/generate", { slug: b.slug, sentiment, picks, items, occasions, note, photo, lang });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");
      setDraft(json.text);
      setMeta(json);
      setStep(2);
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

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      setPhoto(await shrinkPhoto(file));
    } catch {
      setError("Couldn't read that photo. Try a JPG or PNG.");
    }
  }

  const rtl = lang === "ur";
  const canDraft = picks.length > 0 || note.trim().length > 0 || photo !== null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10 pt-6">
      {/* Receipt header */}
      <header className="mb-6 flex items-end justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        <span>
          {b.name} · {b.city}
        </span>
        <span>No. {ticketNo}</span>
      </header>

      <ol className="mb-8 flex gap-1.5" aria-label={`Step ${step + 1} of 3`}>
        {[0, 1, 2].map((i) => (
          <li key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-ink" : "bg-line"}`} />
        ))}
      </ol>

      {step === 0 && (
        <section className="rise" key="s0">
          <p className="font-mono text-xs text-tomato">01 / 03</p>
          <h1 className="mt-2 font-display text-[2.6rem] leading-[1.02] tracking-tight" style={{ fontVariationSettings: "'SOFT' 100" }}>
            How was your visit to <em className="text-tomato">{b.name}</em>?
          </h1>
          <p className="mt-3 text-muted">Honest answers only. Every kind of feedback can be posted.</p>
          <div className="mt-8 grid gap-3">
            {FEELINGS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setSentiment(f.key);
                  setPicks([]);
                  setStep(1);
                }}
                className="group flex items-center gap-4 rounded-2xl border border-line bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-ink active:translate-y-0"
              >
                <Face mouth={f.mouth} color={f.color} />
                <span className="flex-1 text-xl font-medium">{f.label}</span>
                <span className="urdu text-base text-muted">{f.ur}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && sentiment && (
        <section className="rise" key="s1">
          <p className="font-mono text-xs text-tomato">02 / 03</p>
          <h1 className="mt-2 font-display text-[2.2rem] leading-[1.05] tracking-tight">What stood out?</h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted">
            Pick up to three
            <span className="flex gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className={`h-2 w-2 rounded-full ${i < picks.length ? "bg-tomato" : "bg-line"}`} />
              ))}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {b.highlights[sentiment].map((h) => {
              const on = picks.includes(h);
              return (
                <button
                  key={h}
                  aria-pressed={on}
                  onClick={() => toggle(picks, setPicks, h, 3)}
                  disabled={!on && picks.length >= 3}
                  className={`rounded-full border px-4 py-2.5 text-[15px] transition disabled:opacity-35 ${
                    on ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink"
                  }`}
                >
                  {h}
                </button>
              );
            })}
          </div>

          {b.menu.length > 0 && (
            <>
              <div className="dashed my-7" />
              <p className="text-sm font-medium">
                {type.items.question} <span className="text-muted">optional</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {b.menu.map((m) => {
                  const on = items.includes(m);
                  return (
                    <button
                      key={m}
                      aria-pressed={on}
                      onClick={() => toggle(items, setItems, m, 3)}
                      className={`rounded-md border px-3 py-1.5 font-mono text-[13px] transition ${
                        on ? "border-tomato bg-tomato text-tomato-ink" : "border-dashed border-line hover:border-ink"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="dashed my-7" />
          <p className="text-sm font-medium">
            When / who with? <span className="text-muted">optional</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {type.occasions.map((o) => {
              const on = occasions.includes(o);
              return (
                <button
                  key={o}
                  aria-pressed={on}
                  onClick={() => toggle(occasions, setOccasions, o, 2)}
                  className={`rounded-full border px-3 py-1.5 text-[13px] transition ${on ? "border-leaf bg-leaf text-paper" : "border-line hover:border-ink"}`}
                >
                  {o}
                </button>
              );
            })}
          </div>

          <div className="dashed my-7" />
          <label htmlFor="note" className="flex items-baseline justify-between text-sm font-medium">
            <span>
              In your own words <span className="text-muted">optional</span>
            </span>
            <span className="font-mono text-[11px] text-muted">
              {note.length}/{NOTE_MAX}
            </span>
          </label>
          <textarea
            id="note"
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Anything else? English, Urdu or Roman Urdu is fine."
            className="mt-2 w-full resize-none rounded-xl border border-line bg-card px-3 py-2.5 text-[15px] outline-none transition placeholder:text-muted/70 focus:border-ink"
          />

          {type.photo && (
          <div className="mt-4">
            {photo ? (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-card p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                <img src={photo} alt="Your photo" className="h-16 w-16 rounded-lg object-cover" />
                <span className="flex-1 text-sm">AI will look at your photo and mention what it shows.</span>
                <button onClick={() => setPhoto(null)} className="px-2 text-sm text-muted underline underline-offset-4 hover:text-ink">
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-4 text-sm transition hover:border-ink focus-within:border-ink">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                {type.photo?.label} <span className="text-muted">optional</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onPhoto} className="sr-only" />
              </label>
            )}
          </div>
          )}

          <div className="dashed my-7" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium">Write it in</span>
            <div className="flex rounded-full border border-line p-1" role="radiogroup" aria-label="Review language">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  role="radio"
                  aria-checked={lang === l.key}
                  onClick={() => setLang(l.key)}
                  className={`rounded-full px-3.5 py-1 text-sm ${lang === l.key ? "bg-ink text-paper" : "text-muted"} ${l.key === "ur" ? "urdu !text-base !leading-normal" : ""}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-plum">{error}</p>}

          <div className="mt-8 flex gap-3">
            <button onClick={() => setStep(0)} className="rounded-full border border-line px-5 py-3.5 text-sm hover:border-ink">
              Back
            </button>
            <button
              onClick={generate}
              disabled={!canDraft || busy}
              className="flex-1 rounded-full bg-tomato px-5 py-3.5 font-medium text-tomato-ink transition hover:brightness-110 disabled:opacity-40"
            >
              {busy ? "Writing your draft…" : "Draft my review"}
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rise" key="s2">
          <p className="font-mono text-xs text-tomato">03 / 03</p>
          <h1 className="mt-2 font-display text-[2.2rem] leading-[1.05] tracking-tight">Make it yours.</h1>
          <p className="mt-3 text-muted">This draft only uses what you picked. Change anything that doesn&apos;t sound like you.</p>
          {meta?.photo === "used" && (
            <p className="mt-3 flex gap-2 rounded-xl bg-card px-3 py-2 text-sm">
              <span aria-hidden>📷</span>
              <span>
                <span className="font-medium">Seen in your photo:</span> <span className="text-muted">{meta.photoSeen}</span>
              </span>
            </p>
          )}
          {meta?.photo === "nothing-found" && (
            <p className="mt-3 rounded-xl bg-card px-3 py-2 text-sm text-muted">📷 We couldn&apos;t spot {type.photo?.things ?? "anything useful"} in your photo, so it wasn&apos;t used.</p>
          )}
          {meta?.aiBusy && (
            <p className="mt-3 rounded-xl border border-mustard px-3 py-2 text-sm" role="status">
              The AI is busy right now{meta.photo === "unreadable" ? " and couldn't read your photo" : ""}, so this is a simpler draft. Wait a minute and tap{" "}
              <span className="font-medium">Try another wording</span>.
            </p>
          )}

          <div className="ticket print mt-6 rounded-t-2xl border-x border-t border-line p-5">
            <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              <span>Your draft</span>
              <span>{draft.trim().split(/\s+/).length} words</span>
            </div>
            <div className="dashed my-3" />
            <label htmlFor="draft" className="sr-only">
              Your review
            </label>
            <textarea
              id="draft"
              dir={rtl ? "rtl" : "ltr"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={7}
              className={`w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none ${rtl ? "urdu text-lg" : "font-display"}`}
            />
          </div>

          <div className="mt-6 grid gap-3">
            <button onClick={copy} className="rounded-full bg-tomato px-5 py-3.5 font-medium text-tomato-ink transition hover:brightness-110">
              {copied ? "Copied ✓  now paste it on Google" : "1 · Copy review"}
            </button>
            <a
              href={googleLink(b)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => post("/api/event", { slug: b.slug, type: "google" })}
              className="rounded-full border border-ink px-5 py-3.5 text-center font-medium transition hover:bg-ink hover:text-paper"
            >
              2 · Open Google reviews ↗
            </a>
            <button onClick={generate} disabled={busy} className="py-2 text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink">
              {busy ? "Writing…" : "Try another wording"}
            </button>
          </div>

          <p className="mt-8 border-l-2 border-line pl-3 text-xs leading-relaxed text-muted">
            You post it yourself, from your own account. Nothing is posted for you.
            {photo && <span className="mt-1 block">Add your photo on Google too, using the camera icon under the review box.</span>}
            {meta && (
              <span className="mt-1 block font-mono">
                draft: {meta.source} · tidy: {meta.normalizedBy}
              </span>
            )}
          </p>
        </section>
      )}

      <footer className="mt-auto pt-10 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted">SmartFeedback · Real feedback. Smarter reviews.</footer>
    </main>
  );
}
