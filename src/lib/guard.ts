import { rateLimit } from "./store.ts";

// shortcut: trusts the first X-Forwarded-For hop, which Vercel and most hosts set themselves; behind a proxy that passes
// client-sent headers through, use that proxy's own client-IP header instead.
export function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** true = allowed. Counts one hit for `name:id` in a fixed window shared by every server (database-backed). */
export const allow = (name: string, id: string, max: number, windowSec: number) => rateLimit(`${name}:${id}`, max, windowSec);

export const tooMany = () => Response.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
export const TOO_MANY = "Too many tries from this network. Wait a few minutes and try again.";
