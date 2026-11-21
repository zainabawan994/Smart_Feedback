import { ownedBusiness } from "@/lib/auth";
import { getInsight, listDrafts, saveInsight } from "@/lib/store";
import { analyze } from "@/lib/insights.ts";
import { aiInsight } from "@/lib/insights-ai";

const COOLDOWN_MS = 2 * 60_000; // AI runs cost free-tier quota; owners can re-run every 2 minutes

// Owner-only: re-run the AI read of this business's whole feedback history and save it.
export async function POST(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await ownedBusiness(slug);
  if (!b) return Response.json({ error: "Not found" }, { status: 404 });

  const prev = await getInsight(slug);
  const wait = prev ? Math.ceil((+new Date(prev.at) + COOLDOWN_MS - Date.now()) / 1000) : 0;
  if (wait > 0) return Response.json({ error: `Analyzed just now. Try again in ${wait}s.` }, { status: 429 });

  const drafts = await listDrafts(slug, 500);
  const a = analyze(drafts);
  if (a.unhappy === 0) return Response.json({ error: "No complaints yet, so there's nothing to analyze." }, { status: 400 });

  try {
    const insight = await aiInsight(b, a, drafts);
    await saveInsight(slug, insight);
    return Response.json({ insight });
  } catch (e) {
    console.error("[insights] failed:", (e as Error).message);
    const busy = /429|rate limit/i.test((e as Error).message);
    return Response.json({ error: busy ? "The AI is busy (free-tier limit). Try again in a minute." : "The AI couldn't analyze right now. The counts below are still accurate." }, { status: 502 });
  }
}
