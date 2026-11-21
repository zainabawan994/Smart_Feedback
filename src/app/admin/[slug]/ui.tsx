import type { Sentiment } from "@/lib/store";
import { TIME_ZONE } from "@/lib/options";

export const SENT: { key: Sentiment; label: string; color: string }[] = [
  { key: "positive", label: "Loved it", color: "var(--leaf)" },
  { key: "neutral", label: "Okay", color: "var(--mustard)" },
  { key: "negative", label: "Not great", color: "var(--plum)" },
];

export const LANG_LABEL = { en: "English", roman: "Roman Urdu", ur: "اردو" } as const;

// Fixed zone so server-rendered times match what owners in Pakistan expect.
export const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });

/** Calendar date with year, for plan end dates. */
export const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE });

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-5">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{eyebrow}</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight sm:text-5xl">{title}</h1>
      </div>
      {children}
    </header>
  );
}

export const page = "mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10";
export const card = "rounded-2xl border border-line bg-card p-5";
export const eyebrow = "font-mono text-[11px] uppercase tracking-[0.16em] text-muted";
