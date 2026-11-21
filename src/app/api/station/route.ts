import { timingSafeEqual } from "crypto";
import { getBusiness, track, type Sentiment } from "@/lib/store";
import { stationKey } from "@/lib/secret";
import { allow, clientIp, tooMany } from "@/lib/guard";

const SENTIMENTS: Sentiment[] = ["positive", "neutral", "negative"];

/** One button press on the ESP32 feedback station: { slug, key, sentiment }. The key is shown on the owner's QR page. */
export async function POST(req: Request) {
  if (!(await allow("station-ip", clientIp(req.headers), 60, 600))) return tooMany();
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug ?? "").slice(0, 40);
  const given = Buffer.from(String(body.key ?? ""));
  const expected = Buffer.from(stationKey(slug));
  if (!slug || given.length !== expected.length || !timingSafeEqual(given, expected)) return Response.json({ error: "Bad key" }, { status: 401 });
  if (!SENTIMENTS.includes(body.sentiment)) return Response.json({ error: "Bad sentiment" }, { status: 400 });
  if (!(await getBusiness(slug))) return Response.json({ error: "Not found" }, { status: 404 });
  if (!(await allow("station-biz", slug, 30, 60))) return tooMany(); // a stuck button must not flood the overview
  await track(slug, "tap", body.sentiment);
  return Response.json({ ok: true });
}
