import { notFound } from "next/navigation";
import { getBusiness } from "@/lib/store";
import Flow from "./Flow";

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const b = await getBusiness((await params).slug);
  if (!b) notFound();
  return <Flow business={b} />;
}
