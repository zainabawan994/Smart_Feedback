import { track, type EventType } from "@/lib/store";

const TYPES: EventType[] = ["visit", "copy", "google"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!TYPES.includes(body.type)) return Response.json({ error: "Bad event" }, { status: 400 });
  await track(String(body.slug), body.type);
  return Response.json({ ok: true });
}
