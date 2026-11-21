"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AnalyzeButton({ slug, label }: { slug: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/business/${slug}/insights`, { method: "POST" }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) router.refresh();
    else setError(json.error ?? "Couldn't reach the server.");
  }

  return (
    <div className="grid gap-2">
      <button
        onClick={run}
        disabled={busy}
        className="justify-self-start rounded-full bg-tomato px-5 py-2.5 text-sm font-medium text-tomato-ink transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "Reading all your feedback…" : label}
      </button>
      {error && (
        <p className="text-sm text-plum" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
