import { getStats, updateBusiness, type Business } from "@/lib/store";
import { ownedBusiness } from "@/lib/auth";
import { normalizeReviewUrl } from "@/lib/options";
import { typeOf } from "@/lib/business-types";

// Owners only. 404 (not 403) for other people's businesses so slugs can't be probed.
const notFound = () => Response.json({ error: "Not found" }, { status: 404 });

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await ownedBusiness(slug);
  if (!business) return notFound();
  return Response.json({ business, stats: await getStats(slug) });
}

const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, 20) : undefined);

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await ownedBusiness(slug))) return notFound();
  const b = await req.json().catch(() => ({}));
  const url = normalizeReviewUrl(String(b.googleReviewUrl ?? "").slice(0, 500));
  if (url === null) return Response.json({ error: "Paste a Google review link starting with https://, or your Place ID (starts with ChIJ)." }, { status: 400 });
  const patch: Partial<Business> = {
    name: String(b.name ?? "").slice(0, 80) || undefined,
    city: String(b.city ?? "").slice(0, 60) || undefined,
    kind: b.kind ? typeOf(String(b.kind).slice(0, 40)).noun : undefined,
    googleReviewUrl: url || undefined,
    menu: list(b.menu),
    defaultLang: ["en", "ur", "roman"].includes(b.defaultLang) ? b.defaultLang : "en",
  };
  if (b.highlights) patch.highlights = { positive: list(b.highlights.positive) ?? [], neutral: list(b.highlights.neutral) ?? [], negative: list(b.highlights.negative) ?? [] };
  for (const k of Object.keys(patch) as (keyof Business)[]) if (patch[k] === undefined) delete patch[k];
  const saved = await updateBusiness(slug, patch);
  return saved ? Response.json({ business: saved }) : Response.json({ error: "Not found" }, { status: 404 });
}
