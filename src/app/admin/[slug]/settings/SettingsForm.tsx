"use client";

import { useState } from "react";
import { useDraft } from "@/components/forms";
import { useRouter } from "next/navigation";
import type { Business } from "@/lib/store";
import { inputCls } from "@/components/forms";
import { BUSINESS_TYPES, typeOf } from "@/lib/business-types";
import { QUESTIONS_MAX, QUESTION_OPTIONS_MAX } from "@/lib/options";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export default function SettingsForm({ initial, readOnly = false }: { initial: Business; readOnly?: boolean }) {
  const router = useRouter();
  // Unsaved edits are kept per business, so a refresh doesn't lose them.
  const k = `settings:${initial.slug}`;
  const [b, setB] = useDraft(`${k}:b`, initial);
  const [menu, setMenu] = useDraft(`${k}:menu`, initial.menu.join("\n"));
  const [hl, setHl] = useDraft(`${k}:hl`, {
    positive: initial.highlights.positive.join("\n"),
    neutral: initial.highlights.neutral.join("\n"),
    negative: initial.highlights.negative.join("\n"),
  });
  // Owner's own questions, edited as a title + one option per line.
  const [qs, setQs] = useDraft(`${k}:qs`, (initial.questions ?? []).map((q) => ({ title: q.title, options: q.options.join("\n") })));
  const setQ = (i: number, patch: Partial<{ title: string; options: string }>) => setQs(qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const type = typeOf(b.kind);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const res = await fetch(`/api/business/${b.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...b,
        menu: lines(menu),
        highlights: { positive: lines(hl.positive), neutral: lines(hl.neutral), negative: lines(hl.negative) },
        questions: qs.map((q) => ({ title: q.title, options: lines(q.options) })),
      }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (res?.ok) {
      setB(json.business);
      // Show what was kept (empty or one-option questions are dropped on the server).
      setQs((json.business.questions ?? []).map((q: { title: string; options: string[] }) => ({ title: q.title, options: q.options.join("\n") })));
      setStatus({ ok: true, msg: "Saved" });
      router.refresh(); // update the name in the sidebar
    } else setStatus({ ok: false, msg: json.error ?? "Couldn't save. Check your connection." });
  }

  const section = "rounded-2xl border border-line bg-card p-5 sm:p-6";

  return (
    <form onSubmit={save} className="mt-8 grid gap-6">
      <section className={section}>
        <h2 className="font-display text-2xl">Business profile</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <input className={inputCls} value={b.name} maxLength={80} onChange={(e) => setB({ ...b, name: e.target.value })} required />
          </Field>
          <Field label="City">
            <input className={inputCls} value={b.city} maxLength={60} onChange={(e) => setB({ ...b, city: e.target.value })} required />
          </Field>
          <Field label="Google review link" hint="Business Profile → Ask for reviews, or your Place ID">
            <input className={inputCls} value={b.googleReviewUrl} onChange={(e) => setB({ ...b, googleReviewUrl: e.target.value })} placeholder="https://g.page/r/…/review" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select className={inputCls} value={typeOf(b.kind).noun} onChange={(e) => { const t = typeOf(e.target.value); setB({ ...b, kind: e.target.value }); setHl({ positive: t.highlights.positive.join("\n"), neutral: t.highlights.neutral.join("\n"), negative: t.highlights.negative.join("\n") }); }}>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.key} value={t.noun}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Default language">
              <select className={inputCls} value={b.defaultLang} onChange={(e) => setB({ ...b, defaultLang: e.target.value as Business["defaultLang"] })}>
                <option value="en">English</option>
                <option value="roman">Roman Urdu</option>
                <option value="ur">اردو</option>
              </select>
            </Field>
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-display text-2xl">{type.items.title}</h2>
        <p className="mt-1 text-sm text-muted">Customers see &quot;{type.items.question}&quot; and can tap these. Exact names in reviews help people find you on Google and AI search.</p>
        <div className="mt-4 max-w-md">
          <Field label={type.items.title} hint="one per line, up to 20">
            <textarea className={`${inputCls} font-mono text-sm`} rows={8} value={menu} onChange={(e) => setMenu(e.target.value)} placeholder={type.items.placeholder} />
          </Field>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-display text-2xl">Your own questions</h2>
        <p className="mt-1 text-sm text-muted">
          Ask about anything, like &quot;How was the food?&quot; with Excellent / Good / Okay / Poor. Customers tap one answer and the review mentions it. Up to {QUESTIONS_MAX} questions,{" "}
          {QUESTION_OPTIONS_MAX} answers each.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {qs.map((q, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-line bg-paper p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Question {i + 1}</span>
                <button type="button" disabled={readOnly} onClick={() => setQs(qs.filter((_, j) => j !== i))} className="text-sm text-plum underline underline-offset-4 disabled:opacity-50">
                  Remove
                </button>
              </div>
              <Field label="Question">
                <input className={inputCls} value={q.title} maxLength={60} onChange={(e) => setQ(i, { title: e.target.value })} placeholder="How was the food?" />
              </Field>
              <Field label="Answers" hint={`one per line, 2 to ${QUESTION_OPTIONS_MAX}`}>
                <textarea className={`${inputCls} text-sm`} rows={4} value={q.options} onChange={(e) => setQ(i, { options: e.target.value })} placeholder={"Excellent\nGood\nOkay\nPoor"} />
              </Field>
            </div>
          ))}
        </div>
        {qs.length < QUESTIONS_MAX && (
          <button
            type="button"
            disabled={readOnly}
            onClick={() => setQs([...qs, { title: "", options: "" }])}
            className="mt-4 rounded-full border border-ink px-4 py-2 text-sm transition hover:bg-ink hover:text-paper disabled:opacity-50"
          >
            + Add a question
          </button>
        )}
      </section>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <button disabled={saving || readOnly} className="rounded-full bg-ink px-6 py-3 font-medium text-paper transition hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
        {status && (
          <span role="status" className={`text-sm ${status.ok ? "text-leaf" : "text-plum"}`}>
            {status.ok ? "✓ " : ""}
            {status.msg}
          </span>
        )}
      </div>
    </form>
  );
}
