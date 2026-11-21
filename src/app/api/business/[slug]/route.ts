import { getBusiness, getStats, updateBusiness, type Business } from "@/lib/store";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ business, stats: await getStats(slug) });
}

const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, 20) : undefined);

// shortcut: no auth on admin writes; add Supabase Auth before deploying publicly.
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await req.json().catch(() => ({}));
  const url = String(b.googleReviewUrl ?? "");
  if (url && !/^https:\/\//.test(url)) return Response.json({ error: "Review link must start with https://" }, { status: 400 });
  const patch: Partial<Business> = {
    name: String(b.name ?? "").slice(0, 80) || undefined,
    city: String(b.city ?? "").slice(0, 60) || undefined,
    kind: String(b.kind ?? "").slice(0, 30) || undefined,
    googleReviewUrl: url || undefined,
    menu: list(b.menu),
    defaultLang: b.defaultLang === "ur" ? "ur" : "en",
  };
  if (b.highlights) patch.highlights = { positive: list(b.highlights.positive) ?? [], neutral: list(b.highlights.neutral) ?? [], negative: list(b.highlights.negative) ?? [] };
  for (const k of Object.keys(patch) as (keyof Business)[]) if (patch[k] === undefined) delete patch[k];
  const saved = await updateBusiness(slug, patch);
  return saved ? Response.json({ business: saved }) : Response.json({ error: "Not found" }, { status: 404 });
}
