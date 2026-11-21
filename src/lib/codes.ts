import { randomInt, timingSafeEqual } from "crypto";
import { hmac } from "./secret.ts";
import { deleteCode, getCode, putCode, type Code, type CodePurpose } from "./store.ts";
import { codeEmail, sendMail } from "./email.ts";

export const CODE_TTL_MS = 10 * 60_000;
export const RESEND_COOLDOWN_MS = 60_000;
export const MAX_ATTEMPTS = 5;

// Bound to email + purpose, so a reset code can never verify an email and vice versa.
export const codeHash = (email: string, purpose: CodePurpose, code: string) => hmac(`${purpose}:${email.toLowerCase()}:${code}`);

/** Seconds the user must wait before another code can be sent (0 = can send now). */
export function cooldownLeft(c: Pick<Code, "sentAt"> | null, now = Date.now()) {
  return c ? Math.max(0, Math.ceil((c.sentAt + RESEND_COOLDOWN_MS - now) / 1000)) : 0;
}

/** Creates, stores and emails a fresh 6-digit code. Returns seconds to wait if called too soon. */
export async function issueCode(email: string, purpose: CodePurpose): Promise<{ sent: true } | { wait: number }> {
  const wait = cooldownLeft(await getCode(email, purpose));
  if (wait) return { wait };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = Date.now();
  await putCode({ email, purpose, hash: codeHash(email, purpose, code), expiresAt: now + CODE_TTL_MS, attempts: 0, sentAt: now });
  try {
    await sendMail(codeEmail(purpose, code, email));
  } catch (e) {
    await deleteCode(email, purpose); // an unsent code must not block "Send a new code" or be guessable
    throw e;
  }
  return { sent: true };
}

export type CheckResult = "ok" | "wrong" | "expired" | "locked" | "missing";

/** Pure decision for a code attempt; kept separate so it can be unit-tested without storage. */
export function judge(c: Code | null, email: string, purpose: CodePurpose, input: string, now = Date.now()): CheckResult {
  if (!c) return "missing";
  if (c.expiresAt < now) return "expired";
  if (c.attempts >= MAX_ATTEMPTS) return "locked";
  const a = Buffer.from(codeHash(email, purpose, input.replace(/\D/g, "")));
  const b = Buffer.from(c.hash);
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "wrong";
}

/** Checks a code; on success the code is used up, on failure the attempt is counted. */
export async function checkCode(email: string, purpose: CodePurpose, input: string): Promise<CheckResult> {
  const c = await getCode(email, purpose);
  const result = judge(c, email, purpose, input);
  if (result === "ok") await deleteCode(email, purpose);
  else if (result === "wrong") await putCode({ ...c!, attempts: c!.attempts + 1 });
  return result;
}

export const CHECK_MESSAGE: Record<Exclude<CheckResult, "ok">, string> = {
  wrong: "That code isn't right. Check the latest email and try again.",
  expired: "That code has expired. Send a new one.",
  locked: "Too many wrong tries. Send a new code.",
  missing: "No active code. Send a new one.",
};
