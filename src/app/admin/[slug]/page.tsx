import { notFound } from "next/navigation";
import { getBusiness, getStats } from "@/lib/store";
import Dashboard from "./Dashboard";

export default async function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();
  return <Dashboard initial={business} stats={await getStats(slug)} />;
}
