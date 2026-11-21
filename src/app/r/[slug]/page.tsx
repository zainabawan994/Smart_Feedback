import { notFound } from "next/navigation";
import { getBusiness, getStats } from "@/lib/store";
import Flow from "./Flow";

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await getBusiness(slug);
  if (!b) notFound();
  const ticketNo = String((await getStats(slug)).counts.visit + 1); // this visitor's real scan number
  return <Flow business={{ ...b, ownerId: null }} ticketNo={ticketNo} />; // never send owner ids to the public page
}
