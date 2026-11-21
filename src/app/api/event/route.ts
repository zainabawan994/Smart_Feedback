import { track, type EventType } from "@/lib/store";
import { allow, clientIp, tooMany } from "@/lib/guard";

const TYPES: EventType[] = ["visit", "copy", "google"];

export async function POST(req: Request) {
  if (!(await allow("event-ip", clientIp(req.headers), 60, 600))) return tooMany();
  const body = await req.json().catch(() => ({}));
  if (!TYPES.includes(body.type)) return Response.json({ error: "Bad event" }, { status: 400 });
  await track(String(body.slug), body.type);
  return Response.json({ ok: true });
}
