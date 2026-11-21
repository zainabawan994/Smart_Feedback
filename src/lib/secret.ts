import { createHmac, randomBytes } from "crypto";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET (32+ chars) must be set in production");
  // Dev only: a per-process secret means logins and pending codes reset when the server restarts.
  return ((globalThis as { __sfDevSecret?: string }).__sfDevSecret ??= randomBytes(32).toString("hex"));
}

/** Keyed hash used for session cookies and one-time codes. */
export const hmac = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

// shortcut: derived from SESSION_SECRET, so a leaked key can only be replaced by changing that secret (which also logs everyone out); add a per-business key column if stations get lost often.
/** Secret the ESP32 feedback station sends with each tap, one per business. */
export const stationKey = (slug: string) => hmac(`station:${slug}`).slice(0, 24);
