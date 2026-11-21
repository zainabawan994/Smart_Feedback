import { getBusiness, saveDraft, track, type Lang, type Sentiment } from "@/lib/store";
import { draftReview } from "@/lib/review";
import { LANGS, NOTE_MAX, OCCASIONS, PHOTO_MAX_CHARS } from "@/lib/options";
import { allow, clientIp, tooMany } from "@/lib/guard";

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
  const items = arr(body.items).filter((p) => b.menu.includes(p)).slice(0, 3);
  const occasions = arr(body.occasions).filter((o) => (OCCASIONS as readonly string[]).includes(o)).slice(0, 2);
  const note = typeof body.note === "string" ? body.note.replace(/\s+/g, " ").trim().slice(0, NOTE_MAX) : "";

  let photo: string | undefined;
  if (body.photo) {
    if (typeof body.photo !== "string" || body.photo.length > PHOTO_MAX_CHARS || !PHOTO_RE.test(body.photo))
      return Response.json({ error: "Photo must be a JPG, PNG or WebP under about 1 MB" }, { status: 400 });
    photo = body.photo;
  }
  if (!picks.length && !note && !photo) return Response.json({ error: "Pick something, add a photo, or write a few words" }, { status: 400 });

  const result = await draftReview(b, { picks, items, sentiment, lang, occasions, note, photo });
  const tags = [`lang:${lang}`, items.length && "dish", occasions.length && "occasion", photo && "photo", note && "note"].filter(Boolean) as string[];
  await Promise.all([
    track(b.slug, "generate", sentiment, tags),
    // Only what the customer chose plus the draft text; no photo, name, phone or account is stored.
    saveDraft(b.slug, { sentiment, lang, picks, items, occasions, hasPhoto: Boolean(photo), hasNote: Boolean(note), text: result.text, source: result.source }),
  ]);
  return Response.json(result);
}
