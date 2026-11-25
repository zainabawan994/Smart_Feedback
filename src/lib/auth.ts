import { timingSafeEqual } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { hmac } from "./secret.ts";
import { getBusiness, getLoginAttempts, getUserById, listTeamAdmins, putLoginAttempts, type Business, type User } from "./store";

const COOKIE = "sf_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

// Cookie = userId.sessionVersion.expiry.signature. Bumping the user's sessionVersion
// (password change/reset) invalidates every cookie issued before it.
export async function startSession(user: Pick<User, "id" | "sessionVersion">) {
  const payload = `${user.id}.${user.sessionVersion}.${Math.floor(Date.now() / 1000) + MAX_AGE}`;
  (await cookies()).set(COOKIE, `${payload}.${hmac(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in user, verified or not. */
export async function sessionUser(): Promise<User | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  const [userId, ver, exp, mac] = raw?.split(".") ?? [];
  if (!userId || !ver || !exp || !mac) return null;
  const expected = Buffer.from(hmac(`${userId}.${ver}.${exp}`));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  const user = await getUserById(userId);
  return user && String(user.sessionVersion) === ver ? user : null;
}

/** The signed-in user only if their email is verified (what the owner desk needs). */
export async function currentUser(): Promise<User | null> {
  const user = await sessionUser();
  return user?.emailVerified ? user : null;
}

/** Main admins from SUPER_ADMIN_EMAILS (comma-separated). They can't be removed from the panel. */
export const adminEmails = () =>
  (process.env.SUPER_ADMIN_EMAILS ?? "").split(/[,;\s]+/).map((e) => e.replace(/["']/g, "").trim().toLowerCase()).filter(Boolean); // quotes, spaces or ";" pasted by mistake are fine

/** Everyone with admin access: the main admins plus team admins added in the admin panel. */
export const allAdminEmails = cache(async (): Promise<string[]> => {
  const team = await listTeamAdmins().catch((e) => (console.error("[admins] could not read team admins:", (e as Error).message), [] as string[]));
  return [...new Set([...adminEmails(), ...team])];
});

/** Admin = a verified account whose email is a main admin or a team admin. Always await it. */
export async function isAdmin(user: Pick<User, "email" | "emailVerified"> | null) {
  return Boolean(user?.emailVerified && (await allAdminEmails()).includes(user.email.toLowerCase()));
}

/** For super-admin pages. Everyone else gets a 404, so the page doesn't reveal it exists. */
export const requireSuperAdmin = cache(async (): Promise<User> => {
  const user = await sessionUser();
  if (!user) redirect("/superadmin/login");
  if (!(await isAdmin(user))) notFound();
  return user;
});

/** For pages: the signed-in, verified owner of this business, or redirect. A super-admin may open any
 *  business's desk and edit it (asAdmin: true; billing still hides the owner's own payment buttons).
 *  cache(): the admin layout and the page both call this; it runs once per request. */
export const requireOwnerPage = cache(async (slug: string): Promise<{ user: User; business: Business; readOnly: boolean; asAdmin: boolean }> => {
  const [user, business] = await Promise.all([sessionUser(), getBusiness(slug)]);
  if (!user) redirect(`/login?next=/admin/${encodeURIComponent(slug)}`);
  if (!user.emailVerified) redirect("/verify");
  if (!business) redirect("/admin");
  if (await isAdmin(user)) return { user, business, readOnly: false, asAdmin: true };
  if (business.ownerId === user.id) return { user, business, readOnly: false, asAdmin: false };
  redirect("/admin");
});

/** For API routes: the business if the signed-in, verified user owns it and it isn't suspended, else null. */
export async function ownedBusiness(slug: string) {
  const [user, business] = await Promise.all([currentUser(), getBusiness(slug)]);
  if (!user || !business) return null;
  if (await isAdmin(user)) return business; // platform admin manages every business, suspended or not
  return business.ownerId === user.id && !business.suspended ? business : null;
}

// 5 wrong passwords lock that email for 15 minutes. Stored in the database so every server sees it.
export async function loginBlocked(email: string) {
  const a = await getLoginAttempts(email);
  return Boolean(a && a.n >= 5 && a.until > Date.now());
}
export async function noteLoginFailure(email: string) {
  const a = await getLoginAttempts(email);
  const fresh = !a || a.until < Date.now();
  await putLoginAttempts(email, { n: fresh ? 1 : a.n + 1, until: Date.now() + 15 * 60_000 });
}
export async function clearLoginFailures(email: string) {
  await putLoginAttempts(email, null);
}
