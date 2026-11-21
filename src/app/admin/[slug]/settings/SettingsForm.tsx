"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Business } from "@/lib/store";
import { inputCls } from "@/components/forms";
import { SENT } from "../ui";

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

export default function SettingsForm({ initial }: { initial: Business }) {
  const router = useRouter();
  const [b, setB] = useState(initial);
  const [menu, setMenu] = useState(initial.menu.join("\n"));
  const [hl, setHl] = useState({
    positive: initial.highlights.positive.join("\n"),
    neutral: initial.highlights.neutral.join("\n"),
    negative: initial.highlights.negative.join("\n"),
  });
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const res = await fetch(`/api/business/${b.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...b, menu: lines(menu), highlights: { positive: lines(hl.positive), neutral: lines(hl.neutral), negative: lines(hl.negative) } }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (res?.ok) {
      setB(json.business);
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
              <input className={inputCls} value={b.kind} maxLength={30} onChange={(e) => setB({ ...b, kind: e.target.value })} />
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
        <h2 className="font-display text-2xl">Menu</h2>
        <p className="mt-1 text-sm text-muted">Customers can tap what they had. Exact dish names in reviews help people find you on Google and AI search.</p>
        <div className="mt-4 max-w-md">
          <Field label="Menu items" hint="one per line, up to 20">
            <textarea className={`${inputCls} font-mono text-sm`} rows={8} value={menu} onChange={(e) => setMenu(e.target.value)} placeholder={"Doodh patti\nBun kebab"} />
          </Field>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-display text-2xl">Options customers can pick</h2>
        <p className="mt-1 text-sm text-muted">One set per feeling. Keep them honest and specific, like &quot;Food came out hot&quot; or &quot;Long wait&quot;.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {SENT.map((s) => (
            <Field key={s.key} label={s.label} hint="one per line">
              <textarea className={`${inputCls} text-sm`} style={{ borderLeft: `3px solid ${s.color}` }} rows={8} value={hl[s.key]} onChange={(e) => setHl({ ...hl, [s.key]: e.target.value })} />
            </Field>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Don&apos;t add options that tell customers what to say about you. Google treats scripted content as a policy issue.</p>
      </section>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        <button disabled={saving} className="rounded-full bg-ink px-6 py-3 font-medium text-paper transition hover:opacity-90 disabled:opacity-50">
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
