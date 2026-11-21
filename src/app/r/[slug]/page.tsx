import { notFound } from "next/navigation";
import { countVisits, getBusiness } from "@/lib/store";
import Flow from "./Flow";

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [b, visits] = await Promise.all([getBusiness(slug), countVisits(slug)]);
  if (!b) notFound();
  const ticketNo = String(visits + 1); // this visitor's real scan number
  return <Flow business={{ ...b, ownerId: null }} ticketNo={ticketNo} />; // never send owner ids to the public page
}
