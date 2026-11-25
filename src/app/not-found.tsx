import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <div className="ticket rounded-t-2xl border-x border-t border-line p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Order not found · 404</p>
        <div className="dashed my-4" />
        <h1 className="font-display text-4xl tracking-tight">This table card doesn&apos;t lead anywhere.</h1>
        <p className="mt-3 text-muted">The QR code may be old, or the link was typed wrong. Ask the staff for a fresh card.</p>
        <p className="urdu mt-2 text-muted" dir="rtl">یہ لنک درست نہیں۔ عملے سے نیا کارڈ مانگیں۔</p>
      </div>
      <Link href="/" className="mt-8 self-start rounded-full border border-ink px-5 py-3 text-sm transition hover:bg-ink hover:text-paper">
        Go to Tavo
      </Link>
    </main>
  );
}
