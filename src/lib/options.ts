// Shared by the customer page and the API so both accept exactly the same values.

// shortcut: every business is in Pakistan today; store a time zone per business if you open elsewhere.
/** Days in charts and times in the owner desk follow the cafe's clock, not the server's (UTC on most hosts). */
export const TIME_ZONE = "Asia/Karachi";

export const LANGS = [
  { key: "en", label: "English" },
  { key: "roman", label: "Roman Urdu" },
  { key: "ur", label: "اردو" },
] as const;

// "When / who with" chips live per business type in business-types.ts.

export const NOTE_MAX = 300;

/** Email shape for <input pattern> and the server: name@domain.tld, letters/digits/._%+- only. */
export const EMAIL_PATTERN = "[A-Za-z0-9._%+\\-]+@[A-Za-z0-9\\-]+(\\.[A-Za-z0-9\\-]+)*\\.[A-Za-z]{2,}";
const EMAIL_RE = new RegExp(`^${EMAIL_PATTERN}$`);
// Common misspellings, so a code is never mailed to a typo'd address.
const EMAIL_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmal.com": "gmail.com", "gamil.com": "gmail.com", "gnail.com": "gmail.com",
  "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gmail.cm": "gmail.com", "gmail.om": "gmail.com",
  "yaho.com": "yahoo.com", "yahoo.con": "yahoo.com", "yahoo.co": "yahoo.com",
  "hotmial.com": "hotmail.com", "hotmail.con": "hotmail.com", "hotmai.com": "hotmail.com",
  "outlok.com": "outlook.com", "outlook.con": "outlook.com", "icloud.con": "icloud.com",
};
/** null if the email looks right, else a message to show. */
export function emailProblem(email: string): string | null {
  if (email.length > 254 || email.includes("..") || !EMAIL_RE.test(email)) return "Enter a valid email, like name@gmail.com.";
  const [name, domain] = email.split("@");
  const fix = EMAIL_TYPOS[domain.toLowerCase()];
  return fix ? `Check the email: did you mean ${name}@${fix}?` : null;
}
export const RECEIPT_MAX_CHARS = 900_000; // receipt screenshot as a data URL (~650 KB image); the page shrinks it first
export const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
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
  // usd is shown as an approximate price for visitors abroad (about Rs 280 per US dollar); people pay the pkr amount.
  { key: "monthly", label: "Monthly", months: 1, usd: 3.6, pkr: 1000 },
  { key: "6months", label: "6 Months", months: 6, usd: 19.6, pkr: 5500 },
  { key: "yearly", label: "Yearly", months: 12, usd: 41, pkr: 11500 },
] as const;
export type Plan = (typeof PLANS)[number]["key"];
/** A plan key from a URL or form, or null if it isn't one. */
export const asPlan = (v: unknown): Plan | null => PLANS.find((p) => p.key === v)?.key ?? null;
export const planLabel = (p: Plan) => PLANS.find((x) => x.key === p)!.label;
export const planInfo = (p: Plan) => PLANS.find((x) => x.key === p)!;
export const rupees = (n: number) => `Rs ${n.toLocaleString("en-PK")}`;
export const dollars = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
/** A plan's price per month and its saving (in %) against paying month by month. */
export function planMath(p: { pkr: number; months: number }) {
  return { perMonth: Math.round(p.pkr / p.months), save: Math.round((1 - p.pkr / (PLANS[0].pkr * p.months)) * 100) };
}
/** The plan with the lowest price per month. */
export const bestValuePlan = () => PLANS.reduce((a, b) => (b.pkr / b.months < a.pkr / a.months ? b : a)).key;

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

/** Owner's own multiple-choice questions on the customer page (e.g. "Food" → Excellent / Good / Okay / Poor). */
export type CustomQuestion = { title: string; options: string[] };
export type Answer = { q: string; a: string };
export const QUESTIONS_MAX = 4;
export const QUESTION_OPTIONS_MAX = 6;

/** Keeps only well-formed questions: a title and at least 2 distinct options, trimmed to the limits. */
export function cleanQuestions(v: unknown): CustomQuestion[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((q) => ({
      title: String(q?.title ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
      options: [...new Set((Array.isArray(q?.options) ? q.options : []).map((o: unknown) => String(o).replace(/\s+/g, " ").trim().slice(0, 40)).filter(Boolean))].slice(0, QUESTION_OPTIONS_MAX) as string[],
    }))
    .filter((q) => q.title && q.options.length >= 2)
    .filter((q, i, all) => all.findIndex((x) => x.title.toLowerCase() === q.title.toLowerCase()) === i)
    .slice(0, QUESTIONS_MAX);
}

/** Customer answers that match the business's questions exactly; anything else never reaches the AI prompt. */
export function validAnswers(questions: CustomQuestion[], raw: unknown): Answer[] {
  const given = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return questions.flatMap((q) => (typeof given[q.title] === "string" && q.options.includes(given[q.title] as string) ? [{ q: q.title, a: given[q.title] as string }] : []));
}

