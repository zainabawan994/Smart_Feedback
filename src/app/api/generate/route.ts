import { getBusiness, saveDraft, track, type Lang, type Sentiment } from "@/lib/store";
import { draftReview } from "@/lib/review";
import { LANGS, NOTE_MAX, PHOTO_MAX_CHARS, validAnswers } from "@/lib/options";
import { typeOf } from "@/lib/business-types";
import { allow, clientIp, tooMany } from "@/lib/guard";
import { sessionUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const DAY = 86_400;
const DEVICE_PER_DAY = 3; // one review per phone per day, with room to tap "Write it again" twice
const NETWORK_PER_DAY = 10; // per business: customers often share the shop's Wi-Fi, so not lower
const blocked = (slug: string, error: string) =>
  allow("flag", slug, 1e9, 7 * DAY).then(() => Response.json({ error, blocked: true }, { status: 429 })); // counted for the admin's warning

const SENTIMENTS: Sentiment[] = ["positive", "neutral", "negative"];
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > PHOTO_MAX_CHARS + 20_000) return Response.json({ error: "Request too large" }, { status: 413 });
  // Each draft is a paid/quota'd AI call: cap per visitor and per business so a script can't burn the quota or flood the stats.
  const body = await req.json().catch(() => null);
  const slug = String(body?.slug ?? "").slice(0, 40);
  // Three independent lookups at once: each is a database round trip.
  const [ipOk, b, bizOk] = await Promise.all([
    allow("generate-ip", clientIp(req.headers), 15, 600),
    slug ? getBusiness(slug) : null,
    allow("generate-biz", slug, 300, 3600),
  ]);
  if (!ipOk) return tooMany();
  if (!b || b.suspended) return Response.json({ error: "Unknown business" }, { status: 404 });
  if (!bizOk) return tooMany();

  const sentiment = SENTIMENTS.includes(body.sentiment) ? (body.sentiment as Sentiment) : null;
  if (!sentiment) return Response.json({ error: "Pick how your visit was" }, { status: 400 });
  const lang = (LANGS.some((l) => l.key === body.lang) ? body.lang : "en") as Lang;
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  // Only accept options the business/app actually offers, so nothing arbitrary reaches the prompt.
  const picks = arr(body.picks).filter((p) => b.highlights[sentiment].includes(p)).slice(0, 3);
  const answers = validAnswers(b.questions ?? [], body.answers);
  const items = arr(body.items).filter((p) => b.menu.includes(p)).slice(0, 3);
  const type = typeOf(b.kind);
  const occasions = arr(body.occasions).filter((o) => type.occasions.includes(o)).slice(0, 2);
  const note = typeof body.note === "string" ? body.note.replace(/\s+/g, " ").trim().slice(0, NOTE_MAX) : "";

  let photo: string | undefined;
  if (body.photo && type.photo) { // types without photos (clinics, schools) ignore any that are sent
    if (typeof body.photo !== "string" || body.photo.length > PHOTO_MAX_CHARS || !PHOTO_RE.test(body.photo))
      return Response.json({ error: "Photo must be a JPG, PNG or WebP under about 1 MB" }, { status: 400 });
    photo = body.photo;
  }

  // Anti-fake: the owner can't write reviews for their own business, and one phone / one network can't make many.
  const user = await sessionUser();
  if (user && user.id === b.ownerId) return Response.json({ error: "Owner preview: reviews can't be written while you're logged in as the owner." }, { status: 403 });
  const jar = await cookies();
  let device = jar.get("sf_dev")?.value ?? "";
  if (!/^[0-9a-f-]{36}$/.test(device)) {
    device = randomUUID();
    jar.set("sf_dev", device, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 400 * DAY });
  }
  if (!(await allow("review-device", `${b.slug}:${device}`, DEVICE_PER_DAY, DAY)))
    return blocked(b.slug, `You've already written a review for ${b.name} today. Thank you!`);
  if (!(await allow("review-network", `${b.slug}:${clientIp(req.headers)}`, NETWORK_PER_DAY, DAY)))
    return blocked(b.slug, "Too many reviews from this network today. Please try again tomorrow, or switch to mobile data.");

  const result = await draftReview(b, { picks, items, sentiment, lang, occasions, note, photo, answers });
  const tags = [`lang:${lang}`, items.length && "dish", occasions.length && "occasion", photo && "photo", note && "note"].filter(Boolean) as string[];
  await Promise.all([
    track(b.slug, "generate", sentiment, tags),
    // Only what the customer chose plus the draft text; no photo, name, phone or account is stored.
    saveDraft(b.slug, { sentiment, lang, picks, items, occasions, hasPhoto: Boolean(photo), hasNote: Boolean(note), text: result.text, source: result.source, answers }),
  ]);
  return Response.json(result);
}
