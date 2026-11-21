// Shared by the customer page and the API so both accept exactly the same values.

// shortcut: every business is in Pakistan today; store a time zone per business if you open elsewhere.
/** Days in charts and times in the owner desk follow the cafe's clock, not the server's (UTC on most hosts). */
export const TIME_ZONE = "Asia/Karachi";

export const LANGS = [
  { key: "en", label: "English" },
  { key: "roman", label: "Roman Urdu" },
  { key: "ur", label: "اردو" },
] as const;

// "When / who with" context. Search engines and AI assistants match reviews to queries like
// "breakfast spot in Lahore" or "family dinner place", so customer-chosen context helps discovery.
export const OCCASIONS = ["Breakfast", "Lunch", "Dinner", "Evening chai", "With family", "With friends", "Date", "Work meeting", "Takeaway"] as const;

export const NOTE_MAX = 300;
export const PHOTO_MAX_CHARS = 1_500_000; // ~1.1 MB image as a data URL; the page downsizes before sending

/** Owner input -> review link. Accepts a full https link or a bare Google Place ID (starts with "ChIJ"). null = invalid. */
export function normalizeReviewUrl(input: string): string | null {
  const v = input.trim();
  if (!v) return "";
  if (/^ChIJ[\w-]{10,}$/.test(v)) return `https://search.google.com/local/writereview?placeid=${v}`;
  return /^https:\/\/\S+$/.test(v) ? v : null;
}

/** Where "Open Google reviews" goes: the owner's link, or a Maps search for the place until they add one. */
export function googleLink(b: { googleReviewUrl: string; name: string; city: string }) {
  if (b.googleReviewUrl && !b.googleReviewUrl.includes("REPLACE_WITH")) return b.googleReviewUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name} ${b.city}`)}`;
}

/** Subscription plans the super-admin can set (payments are not wired up yet). */
// pkr: what owners transfer (bank / Easypaisa / JazzCash). Matches the USD prices on the home page at about Rs 280 per dollar.
export const PLANS = [
  { key: "monthly", label: "Monthly", months: 1, usd: 12, pkr: 3400 },
  { key: "6months", label: "6 Months", months: 6, usd: 60, pkr: 17000 },
  { key: "yearly", label: "Yearly", months: 12, usd: 96, pkr: 27000 },
] as const;
export type Plan = (typeof PLANS)[number]["key"];
/** A plan key from a URL or form, or null if it isn't one. */
export const asPlan = (v: unknown): Plan | null => PLANS.find((p) => p.key === v)?.key ?? null;
export const planLabel = (p: Plan) => PLANS.find((x) => x.key === p)!.label;
export const planInfo = (p: Plan) => PLANS.find((x) => x.key === p)!;
export const rupees = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;

export const PAYMENT_METHODS = [
  { key: "bank", label: "Bank transfer" },
  { key: "easypaisa", label: "Easypaisa" },
  { key: "jazzcash", label: "JazzCash" },
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["key"];

/** New expiry when a payment is approved: renewals extend the current plan, otherwise it starts now. */
export function planEnd(currentExpiry: string | null | undefined, months: number, now = new Date()) {
  const cur = currentExpiry ? new Date(currentExpiry) : null;
  const start = cur && cur > now ? cur : now;
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return end.toISOString();
}

/** Plan status the way the super-admin needs to read it at a glance. */
/** Whole days from now until `iso` (negative once it has passed). */
export const daysUntil = (iso: string, now = Date.now()) => Math.ceil((+new Date(iso) - now) / 86_400_000);
/** True while `iso` is still ahead (a plan ending this very minute is already over). */
export const isFuture = (iso: string | null | undefined, now = Date.now()) => Boolean(iso && +new Date(iso) > now);

export function planState(b: { plan?: Plan | null; planExpiresAt?: string | null; suspended?: boolean; planCancelledAt?: string | null }, now = Date.now()) {
  if (b.suspended) return { label: "Suspended", tone: "bad" as const };
  if (!b.plan) return { label: "No plan", tone: "muted" as const };
  const name = PLANS.find((p) => p.key === b.plan)?.label ?? b.plan;
  const left = b.planExpiresAt ? daysUntil(b.planExpiresAt, now) : null;
  if (b.planExpiresAt && !isFuture(b.planExpiresAt, now)) return { label: `${name} · expired`, tone: "bad" as const };
  if (b.planCancelledAt) return { label: `${name} · cancelled${left !== null ? `, ends in ${left}d` : ""}`, tone: "warn" as const };
  if (left !== null && left <= 7) return { label: `${name} · ${left}d left`, tone: "warn" as const };
  return { label: name, tone: "ok" as const };
}
