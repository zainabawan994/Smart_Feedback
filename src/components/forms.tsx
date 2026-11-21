"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import type { FormState } from "@/lib/actions";
import { shrinkImage } from "@/lib/image";
import { BUSINESS_TYPES } from "@/lib/business-types";

export const inputCls = "w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-[15px] outline-none transition focus:border-ink";

export function Field({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted">{hint}</span>}
      <input className={`${inputCls} mt-1.5`} {...props} />
    </label>
  );
}

function Submit({ children, pending }: { children: React.ReactNode; pending: boolean }) {
  return (
    <button disabled={pending} className="mt-2 w-full rounded-full bg-tomato px-5 py-3.5 font-medium text-tomato-ink transition hover:brightness-110 disabled:opacity-50">
      {pending ? "One moment…" : children}
    </button>
  );
}

/** Business name, city, type and review link: shared by sign-up and "add a business". */
export function PlaceFields() {
  return (
    <>
      <Field label="Business name" name="name" required maxLength={80} placeholder="e.g. Chai Khana" />
      <Field label="City" name="city" required maxLength={60} placeholder="Lahore" />
      <label className="block">
        <span className="text-sm font-medium">Type of business</span>
        <span className="ml-2 text-xs text-muted">sets the questions customers see</span>
        <select name="kind" defaultValue="café" className={`${inputCls} mt-1.5`}>
          {BUSINESS_TYPES.map((t) => (
            <option key={t.key} value={t.noun}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <Field label="Google review link" hint="optional: link or Place ID" name="googleReviewUrl" placeholder="https://g.page/r/…/review" />
    </>
  );
}

export function ActionForm({ action, submit, children }: { action: (s: FormState, f: FormData) => Promise<FormState>; submit: string; children: React.ReactNode }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form
      className="grid gap-4"
      // Submitting through onSubmit (not the action prop) stops React from clearing the fields after an error.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {children}
      <Notice state={state} />
      <Submit pending={pending}>{submit}</Submit>
    </form>
  );
}

function Notice({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <p className="rounded-lg border border-plum/40 px-3 py-2 text-sm text-plum" role="alert">
        {state.error}
      </p>
    );
  if (state?.info)
    return (
      <p className="rounded-lg border border-leaf/50 px-3 py-2 text-sm text-leaf" role="status">
        {state.info}
      </p>
    );
  return null;
}

/** Big 6-digit code box; phones offer to fill it straight from the email/SMS. */
export function CodeInput() {
  return (
    <label className="block">
      <span className="text-sm font-medium">6-digit code</span>
      <input
        name="code"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        placeholder="••••••"
        autoFocus
        className={`${inputCls} mt-1.5 text-center font-mono text-3xl tracking-[0.5em] placeholder:tracking-[0.5em]`}
      />
    </label>
  );
}

/** "Send a new code" link-button with a 60 s countdown after each send. */
export function ResendButton({ action }: { action: () => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [now, setNow] = useState(0);
  const sentAt = state?.sentAt;
  useEffect(() => {
    if (!sentAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sentAt]);
  const left = !sentAt ? 0 : !now ? 60 : Math.max(0, Math.ceil((sentAt + 60_000 - now) / 1000));
  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={pending || left > 0}
        onClick={() => startTransition(() => formAction())}
        className="justify-self-start text-sm underline decoration-line underline-offset-4 hover:decoration-ink disabled:no-underline disabled:opacity-60"
      >
        {pending ? "Sending…" : left ? `Send a new code in ${left}s` : "Send a new code"}
      </button>
      <Notice state={state} />
    </div>
  );
}

/** Centered receipt card used by login, sign-up and add-business pages. */
export function AuthCard({ eyebrow, title, children, footer }: { eyebrow: string; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-8 font-display text-xl tracking-tight">
        Smart<span className="text-tomato">Feedback</span>
      </Link>
      <div className="ticket rounded-t-2xl border-x border-t border-line p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
        <div className="dashed my-4" />
        <h1 className="mb-6 font-display text-3xl tracking-tight">{title}</h1>
        {children}
      </div>
      {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
    </main>
  );
}

/** Shown on sign-up and log-in when the visitor came from a pricing button. */
export function PlanNote({ label }: { label: string }) {
  return (
    <p className="-mt-2 mb-5 rounded-lg border border-mustard px-3 py-2 text-sm">
      <span className="font-medium">{label} plan selected.</span> Continue and we&apos;ll switch it on for your business once payment is confirmed.
    </p>
  );
}

/** Receipt screenshot for a payment: shrunk in the browser and sent as a data URL in a hidden "receipt" field
 *  (the file itself is not submitted, so big phone screenshots stay under the upload limit). */
export function ReceiptInput() {
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState("");
  return (
    <div>
      <span className="text-sm font-medium">Payment screenshot</span>
      <span className="ml-2 text-xs text-muted">photo of the receipt showing amount and TID</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required
        className={`${inputCls} mt-1.5 file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1 file:text-paper`}
        onChange={async (e) => {
          setError("");
          setReceipt("");
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            setReceipt(await shrinkImage(file, 1400)); // big enough to read the amount and TID
          } catch {
            setError("Couldn't read that image. Try a JPG or PNG screenshot.");
          }
        }}
      />
      <input type="hidden" name="receipt" value={receipt} />
      {error && <p className="mt-1 text-sm text-plum">{error}</p>}
      {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a data URL */}
      {receipt && <img src={receipt} alt="Receipt preview" className="mt-2 max-h-40 rounded-lg border border-line" />}
    </div>
  );
}
