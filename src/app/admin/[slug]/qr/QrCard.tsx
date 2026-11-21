"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function QrCard({ name, slug, url }: { name: string; slug: string; url: string }) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  function download() {
    const a = document.createElement("a");
    a.href = qrRef.current!.toDataURL("image/png");
    a.download = `${slug}-review-qr.png`;
    a.click();
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_1fr]">
      {/* Printable card: only this element shows when printing (see print styles below). */}
      <div id="table-card" className="ticket mx-auto w-full max-w-[22rem] rounded-t-2xl border-x border-t border-line p-7 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{name}</p>
        <div className="dashed my-4" />
        <p className="font-display text-3xl leading-tight tracking-tight">How was your visit?</p>
        <div className="mx-auto mt-5 w-fit rounded-xl bg-white p-3">
          <QRCodeCanvas ref={qrRef} value={url} size={512} style={{ width: 200, height: 200 }} fgColor="#1c1a16" level="M" marginSize={0} />
        </div>
        <p className="mt-4 text-[15px]">Scan · tap three things · done</p>
        <p className="urdu mt-1 text-muted">اسکین کریں، تین چیزیں چنیں</p>
        <div className="dashed my-4" />
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Your words · your review</p>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl">Print or share</h2>
          <p className="mt-1 text-sm text-muted">The PNG is high resolution (512px), sharp enough for table tents, menus and posters.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button onClick={download} className="rounded-full bg-tomato px-4 py-3 font-medium text-tomato-ink transition hover:brightness-110">
              Download QR (PNG)
            </button>
            <button onClick={() => window.print()} className="rounded-full border border-ink px-4 py-3 font-medium transition hover:bg-ink hover:text-paper">
              Print table card
            </button>
          </div>
          <div className="dashed my-5" />
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Review page link</p>
          <div className="mt-2 flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-paper px-3 py-2 text-sm">{url}</code>
            <button onClick={copy} className="shrink-0 rounded-lg border border-line px-3 text-sm transition hover:border-ink">
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">Share it on WhatsApp, receipts or Instagram bio too.</p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-5 text-sm">
          <h2 className="font-display text-xl">Placement tips</h2>
          <ul className="mt-3 grid gap-2 text-muted">
            <li>• Put a card on every table and at the counter, where people wait for the bill.</li>
            <li>• Staff can mention it when they bring the bill: &quot;If you have a minute, tell us how it was.&quot;</li>
            <li>• Ask every customer, happy or not. Offering rewards for reviews, or only asking happy customers, breaks Google&apos;s rules.</li>
          </ul>
        </div>
      </div>

      <style>{`@media print {
        body * { visibility: hidden; }
        #table-card, #table-card * { visibility: visible; }
        #table-card { position: absolute; left: 50%; top: 2rem; transform: translateX(-50%); border: 1px solid #ccc; }
      }`}</style>
    </div>
  );
}
