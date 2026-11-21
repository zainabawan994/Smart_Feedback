import Link from "next/link";
import type { planState } from "@/lib/options";

export const shell = "mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10";

export function TopBar({ email }: { email: string }) {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
      <Link href="/superadmin" className="font-display text-xl tracking-tight">
        Smart<span className="text-tomato">Feedback</span> <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">super admin</span>
      </Link>
      <span className="flex items-center gap-4 text-sm">
        <span className="truncate text-muted">{email}</span>
        <Link href="/admin" className="underline underline-offset-4">
          My desk
        </Link>
      </span>
    </nav>
  );
}

const TONE = { ok: "bg-leaf text-paper", warn: "bg-mustard text-ink", bad: "bg-plum text-paper", muted: "border border-line text-muted" };

export function StateBadge({ state }: { state: ReturnType<typeof planState> }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${TONE[state.tone]}`}>{state.label}</span>;
}
