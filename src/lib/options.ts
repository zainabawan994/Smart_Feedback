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
