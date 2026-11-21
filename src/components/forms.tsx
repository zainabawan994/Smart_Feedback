"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import type { FormState } from "@/lib/actions";

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
      <div className="grid grid-cols-[1fr_8rem] gap-3">
        <Field label="City" name="city" required maxLength={60} placeholder="Lahore" />
        <Field label="Type" name="kind" maxLength={30} placeholder="café" />
      </div>
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
