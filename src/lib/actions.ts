"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearLoginFailures, currentUser, endSession, isSuperAdmin, loginBlocked, noteLoginFailure, sessionUser, startSession } from "./auth";
import { CHECK_MESSAGE, checkCode, issueCode } from "./codes.ts";
import { createBusiness, createPayment, createUser, getBusiness, getPayment, getUserByEmail, setPaymentStatus, updateBusiness, updateUser } from "./store";
import { paymentAccounts } from "./billing.ts";
import { hashPassword, verifyPassword } from "./password.ts";
import { typeOf } from "./business-types.ts";
import { IMAGE_DATA_URL, PLANS, RECEIPT_MAX_CHARS, asPlan, normalizeReviewUrl, planEnd, planInfo, planLabel, rupees, type Plan } from "./options.ts";
import { TOO_MANY, allow, clientIp } from "./guard.ts";

export type FormState = { error?: string; info?: string; sentAt?: number } | undefined;

const str = (f: FormData, k: string, max = 120) => String(f.get(k) ?? "").trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Only redirect inside the admin area, never to another site.
const safeNext = (n: string) => (/^\/admin(\/[a-z0-9-]*)*$/.test(n) ? n : "/admin");
const RESET_COOKIE = "sf_reset_email";
const NEW_EMAIL_COOKIE = "sf_new_email"; // pending address during "change email"; the code mailed to it proves ownership

function newPassword(f: FormData): { password: string } | { error: string } {
  const password = String(f.get("password") ?? "");
  if (password.length < 8 || password.length > 200) return { error: "Password needs at least 8 characters." };
  if (f.has("confirm") && f.get("confirm") !== password) return { error: "The two passwords don't match." };
  return { password };
}

function placeFields(f: FormData) {
  const googleReviewUrl = normalizeReviewUrl(str(f, "googleReviewUrl", 500));
  if (googleReviewUrl === null) return { error: "Paste a Google review link starting with https://, or your Place ID (starts with ChIJ)." };
  const place = { name: str(f, "name", 80), city: str(f, "city", 60), kind: typeOf(str(f, "kind", 40) || "café").noun, googleReviewUrl };
  if (!place.name || !place.city) return { error: "Add your business name and city." };
  return { place };
}

/** Per-network cap for forms that create accounts, send email or check passwords. */
const ipAllowed = async (name: string, max: number, windowSec: number) => allow(name, clientIp(await headers()), max, windowSec);

/** Send a code, but never let an email outage crash the page. */
async function trySend(email: string, purpose: "verify" | "reset") {
  try {
    return await issueCode(email, purpose);
  } catch (e) {
    console.error(`[email] ${purpose} code to ${email.replace(/(.).+@/, "$1***@")} failed:`, (e as Error).message);
    return { failed: true as const };
  }
}

/* ---------------- sign up / log in / log out ---------------- */

export async function signup(_: FormState, f: FormData): Promise<FormState> {
  if (!(await ipAllowed("signup-ip", 5, 3600))) return { error: TOO_MANY };
  const email = str(f, "email").toLowerCase();
  if (!EMAIL.test(email)) return { error: "Enter a valid email." };
  const pw = newPassword(f);
  if ("error" in pw) return pw;
  const { place, error } = placeFields(f);
  if (!place) return { error };
  const user = await createUser(email, pw.password);
  if (!user) return { error: "That email already has an account. Log in instead." };
  const business = await createBusiness(place, user.id);
  const plan = asPlan(f.get("plan"));
  if (plan) await updateBusiness(business.slug, { requestedPlan: plan }); // picked on the pricing page
  await startSession(user);
  const sent = await trySend(email, "verify");
  redirect("failed" in sent ? "/verify?unsent=1" : "/verify");
}

export async function login(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  if (!(await ipAllowed("login-ip", 30, 900))) return { error: TOO_MANY }; // many emails from one place = credential stuffing
  if (await loginBlocked(email)) return { error: "Too many tries. Wait 15 minutes, or reset your password." };
  const user = await getUserByEmail(email);
  // Same message either way so the form doesn't reveal which emails have accounts.
  if (!user || !verifyPassword(String(f.get("password") ?? ""), user.passwordHash)) {
    await noteLoginFailure(email);
    return { error: "Email or password is wrong." };
  }
  await clearLoginFailures(email);
  await startSession(user);
  if (!user.emailVerified) {
    const sent = await trySend(email, "verify"); // no-op if one was sent in the last minute
    redirect("failed" in sent ? "/verify?unsent=1" : "/verify");
  }
  const plan = asPlan(f.get("plan"));
  redirect(plan ? `/admin/plan?plan=${plan}` : safeNext(str(f, "next", 200)));
}

export async function logout() {
  await endSession();
  redirect("/login");
}

/* ---------------- email verification ---------------- */

export async function verifyEmail(_: FormState, f: FormData): Promise<FormState> {
  const user = await sessionUser();
  if (!user) redirect("/login");
  if (user.emailVerified) redirect("/admin");
  const result = await checkCode(user.email, "verify", str(f, "code", 20));
  if (result !== "ok") return { error: CHECK_MESSAGE[result] };
  await updateUser(user.id, { emailVerified: true });
  redirect("/admin");
}

export async function resendVerification(): Promise<FormState> {
  const user = await sessionUser();
  if (!user) redirect("/login");
  const r = await trySend(user.email, "verify");
  if ("wait" in r) return { error: `Please wait ${r.wait}s before asking for another code.` };
  if ("failed" in r) return { error: "We couldn't send the email right now. Try again in a minute." };
  return { info: "New code sent. Check your inbox and spam folder.", sentAt: Date.now() };
}

/* ---------------- forgot / reset password ---------------- */

export async function forgotPassword(_: FormState, f: FormData): Promise<FormState> {
  if (!(await ipAllowed("forgot-ip", 5, 900))) return { error: TOO_MANY };
  const email = str(f, "email").toLowerCase();
  if (!EMAIL.test(email)) return { error: "Enter a valid email." };
  // Only send if the account exists, but behave the same either way (no account probing).
  if (await getUserByEmail(email)) {
    const r = await trySend(email, "reset");
    if ("wait" in r) return { error: `Please wait ${r.wait}s before asking for another code.` };
  }
  (await cookies()).set(RESET_COOKIE, email, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 15 * 60 });
  redirect("/reset");
}

export async function resendReset(): Promise<FormState> {
  const email = (await cookies()).get(RESET_COOKIE)?.value;
  if (!email) redirect("/forgot");
  if (await getUserByEmail(email)) {
    const r = await trySend(email, "reset");
    if ("wait" in r) return { error: `Please wait ${r.wait}s before asking for another code.` };
  }
  return { info: "If that email has an account, a new code is on its way.", sentAt: Date.now() };
}

export async function resetPassword(_: FormState, f: FormData): Promise<FormState> {
  const email = (await cookies()).get(RESET_COOKIE)?.value;
  if (!email) redirect("/forgot");
  const pw = newPassword(f);
  if ("error" in pw) return pw;
  const result = await checkCode(email, "reset", str(f, "code", 20));
  if (result !== "ok") return { error: CHECK_MESSAGE[result] };
  const user = await getUserByEmail(email);
  if (!user) return { error: CHECK_MESSAGE.missing };
  // New password logs out every other device; the code also proves they own the email.
  const updated = await updateUser(user.id, { passwordHash: hashPassword(pw.password), emailVerified: true });
  (await cookies()).delete(RESET_COOKIE);
  await clearLoginFailures(email);
  await startSession(updated!);
  redirect("/admin");
}

/* ---------------- signed-in account ---------------- */

export async function changePassword(_: FormState, f: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!(await allow("password-change", user.id, 10, 3600))) return { error: TOO_MANY }; // stolen session can't brute-force the current password
  if (!verifyPassword(String(f.get("current") ?? ""), user.passwordHash)) return { error: "Your current password is wrong." };
  const pw = newPassword(f);
  if ("error" in pw) return pw;
  const updated = await updateUser(user.id, { passwordHash: hashPassword(pw.password) });
  await startSession(updated!); // keep this device signed in with the new version
  return { info: "Password changed. Other devices have been signed out." };
}

const accountPage = (f: FormData) => safeNext(`/admin/${str(f, "slug", 40)}/account`);

/** Step 1: check the password, then mail a code to the new address. The login email changes only after step 2. */
export async function startEmailChange(_: FormState, f: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!(await allow("email-change", user.id, 5, 3600))) return { error: TOO_MANY };
  if (!verifyPassword(String(f.get("current") ?? ""), user.passwordHash)) return { error: "Your current password is wrong." };
  const email = str(f, "email").toLowerCase();
  if (!EMAIL.test(email)) return { error: "Enter a valid email." };
  if (email === user.email) return { error: "That is already your email." };
  if (await getUserByEmail(email)) return { error: "That email already has an account." };
  const r = await trySend(email, "verify");
  if ("wait" in r) return { error: `Please wait ${r.wait}s before asking for another code.` };
  if ("failed" in r) return { error: "We couldn't send the email right now. Try again in a minute." };
  (await cookies()).set(NEW_EMAIL_COOKIE, email, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 15 * 60 });
  redirect(accountPage(f));
}

/** Step 2: the code from the new inbox switches the login email and signs out other devices. */
export async function confirmEmailChange(_: FormState, f: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const email = (await cookies()).get(NEW_EMAIL_COOKIE)?.value;
  if (!email) return { error: "This request expired. Start again." };
  const result = await checkCode(email, "verify", str(f, "code", 20));
  if (result !== "ok") return { error: CHECK_MESSAGE[result] };
  if (await getUserByEmail(email)) return { error: "That email already has an account." }; // taken while the code was pending
  const updated = await updateUser(user.id, { email, emailVerified: true });
  (await cookies()).delete(NEW_EMAIL_COOKIE);
  await startSession(updated!);
  redirect(`${accountPage(f)}?changed=1`);
}

export async function cancelEmailChange(f: FormData) {
  (await cookies()).delete(NEW_EMAIL_COOKIE);
  redirect(accountPage(f));
}

/** Owner reports a transfer for a plan. It waits as "pending" until the super-admin checks the account and approves. */
export async function submitPayment(_: FormState, f: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!(await allow("payment-submit", user.id, 5, 3600))) return { error: TOO_MANY };
  const business = await getBusiness(str(f, "slug", 40));
  if (!business || business.ownerId !== user.id) return { error: "Business not found." };
  const plan = asPlan(f.get("plan"));
  if (!plan) return { error: "Pick a plan." };
  const method = paymentAccounts().find((a) => a.method === f.get("method"))?.method;
  if (!method) return { error: "Pick how you paid." };
  const reference = str(f, "reference", 60).replace(/\s+/g, "");
  if (!/^[A-Za-z0-9-]{6,60}$/.test(reference)) return { error: "Enter the transaction ID from your receipt (letters and numbers, at least 6)." };
  const payer = str(f, "payer", 80);
  if (!payer) return { error: "Enter the name or number you paid from, so we can find it." };
  const receipt = String(f.get("receipt") ?? "");
  if (!receipt) return { error: "Add a screenshot of your payment receipt." };
  if (receipt.length > RECEIPT_MAX_CHARS || !IMAGE_DATA_URL.test(receipt)) return { error: "The screenshot must be a JPG, PNG or WebP image." };
  const payment = await createPayment({ slug: business.slug, plan, amountPkr: planInfo(plan).pkr, method, reference, payer, receipt });
  if (!payment) return { error: "That transaction ID was already submitted." };
  await updateBusiness(business.slug, { requestedPlan: plan });
  revalidatePath(`/admin/${business.slug}/billing`);
  return { info: `Thanks! We received your ${planLabel(plan)} payment of ${rupees(planInfo(plan).pkr)}. Your plan switches on as soon as we confirm it, usually within a day.` };
}

/** The owner's own business, for billing actions. */
async function ownBusinessFromForm(f: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const business = await getBusiness(str(f, "slug", 40));
  return business && business.ownerId === user.id ? business : null;
}

/** Owner withdraws a payment report before it is approved (wrong amount, wrong TID...). */
export async function cancelPayment(f: FormData) {
  const business = await ownBusinessFromForm(f);
  const payment = business && (await getPayment(str(f, "id", 60)));
  if (!business || !payment || payment.slug !== business.slug) return;
  if (await setPaymentStatus(payment.id, "pending", "cancelled", "Cancelled by the owner.")) await updateBusiness(business.slug, { requestedPlan: null });
  revalidatePath(`/admin/${business.slug}/billing`);
}

/** Owner cancels the plan: it keeps running to its end date and is not renewed. Undo puts it back. */
export async function cancelPlan(f: FormData) {
  const business = await ownBusinessFromForm(f);
  if (!business?.plan) return;
  await updateBusiness(business.slug, { planCancelledAt: f.get("undo") ? null : new Date().toISOString() });
  revalidatePath(`/admin/${business.slug}/billing`);
}

/** Super-admin: approve / reject a pending payment, or mark an approved one refunded. */
export async function decidePaymentAction(f: FormData) {
  const user = await currentUser();
  if (!isSuperAdmin(user)) return;
  const id = str(f, "id", 60);
  const decision = String(f.get("decision"));
  const typed = str(f, "note", 200);
  let payment = null;
  if (decision === "approve") {
    payment = await setPaymentStatus(id, "pending", "approved", null);
    const business = payment && (await getBusiness(payment.slug));
    if (payment && business) {
      // Renewing the same plan extends from the current end date; anything else starts today.
      const keep = business.plan === payment.plan ? business.planExpiresAt : null;
      await updateBusiness(payment.slug, { plan: payment.plan, planExpiresAt: planEnd(keep, planInfo(payment.plan).months), requestedPlan: null, planCancelledAt: null, suspended: false });
    }
  } else if (decision === "reject") {
    payment = await setPaymentStatus(id, "pending", "rejected", typed || "We couldn't find this payment. Check the transaction ID and submit again.");
    if (payment) await updateBusiness(payment.slug, { requestedPlan: null });
  } else if (decision === "refund") {
    // Money goes back outside the app (bank / wallet); this records it and, if asked, ends the plan now.
    payment = await setPaymentStatus(id, "approved", "refunded", typed || "Refunded.");
    if (payment && f.get("endPlan")) await updateBusiness(payment.slug, { planExpiresAt: new Date().toISOString() });
  }
  revalidatePath("/superadmin");
  if (payment) {
    revalidatePath(`/superadmin/${payment.slug}`);
    revalidatePath(`/admin/${payment.slug}/billing`);
  }
}

/* ---------------- super-admin ---------------- */

/** Suspend / resume a business and set its plan. Expiry left empty = today + the plan's length. */
export async function superAdminUpdateBusiness(_: FormState, f: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!isSuperAdmin(user)) return { error: "Not allowed." };
  const slug = str(f, "slug", 40);
  if (!(await getBusiness(slug))) return { error: "Business not found." };
  const planKey = str(f, "plan", 20);
  const plan = PLANS.find((p) => p.key === planKey);
  if (planKey && !plan) return { error: "Unknown plan." };
  let planExpiresAt: string | null = null;
  const expires = str(f, "expires", 10);
  if (plan) {
    if (expires) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expires) || isNaN(Date.parse(expires))) return { error: "Pick a valid expiry date." };
      planExpiresAt = new Date(`${expires}T23:59:59+05:00`).toISOString(); // end of that day, Pakistan time
    } else {
      const d = new Date();
      d.setMonth(d.getMonth() + plan.months);
      planExpiresAt = d.toISOString();
    }
  }
  // Switching a plan on answers the owner's request, so clear it.
  await updateBusiness(slug, { suspended: f.get("suspended") === "on", plan: (plan?.key ?? null) as Plan | null, planExpiresAt, ...(plan ? { requestedPlan: null } : { planCancelledAt: null }) });
  return { info: "Saved." };
}

export async function addBusiness(_: FormState, f: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { place, error } = placeFields(f);
  if (!place) return { error };
  const business = await createBusiness(place, user.id);
  redirect(`/admin/${business.slug}/settings?welcome=1`);
}
