import { getBusiness, track, type Lang, type Sentiment } from "@/lib/store";
import { draftReview } from "@/lib/review";

const SENTIMENTS: Sentiment[] = ["positive", "neutral", "negative"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const b = body && (await getBusiness(String(body.slug)));
  if (!b) return Response.json({ error: "Unknown business" }, { status: 404 });

  const sentiment = SENTIMENTS.includes(body.sentiment) ? (body.sentiment as Sentiment) : null;
  const lang: Lang = body.lang === "ur" ? "ur" : "en";
  // Only accept options the business actually offers, so nothing arbitrary reaches the prompt.
  const picks = (Array.isArray(body.picks) ? body.picks : []).filter((p: unknown) => sentiment && b.highlights[sentiment].includes(p as string)).slice(0, 3);
  const items = (Array.isArray(body.items) ? body.items : []).filter((p: unknown) => b.menu.includes(p as string)).slice(0, 3);
  if (!sentiment || picks.length === 0) return Response.json({ error: "Pick a feeling and at least one option" }, { status: 400 });

  const result = await draftReview(b, { picks, items, sentiment, lang });
  await track(b.slug, "generate", sentiment);
  return Response.json(result);
}
