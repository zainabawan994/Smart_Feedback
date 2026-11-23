import { notFound } from "next/navigation";
import { getBusiness } from "@/lib/store";
import { sessionUser } from "@/lib/auth";
import Flow from "./Flow";

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await getBusiness(slug);
  if (!b) notFound();
  if (b.suspended)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{b.name}</p>
        <h1 className="mt-3 font-display text-3xl tracking-tight">Feedback is paused right now</h1>
        <p className="mt-2 text-muted">Thanks for stopping by. Please try again later.</p>
      </main>
    );
  const ownerPreview = (await sessionUser())?.id === b.ownerId; // the owner can look, not write reviews
  return <Flow business={{ ...b, ownerId: null, plan: null, planExpiresAt: null }} ownerPreview={ownerPreview} />; // never send owner ids or plan details to the public page
}
