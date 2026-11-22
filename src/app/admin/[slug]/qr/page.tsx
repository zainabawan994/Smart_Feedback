import { headers } from "next/headers";
import { requireOwnerPage } from "@/lib/auth";
import { PageHeader, page } from "../ui";
import QrCard from "./QrCard";

export default async function QrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { business } = await requireOwnerPage(slug);
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/r/${slug}`;
  return (
    <div className={page}>
      <PageHeader eyebrow={`${business.name} · QR code & link`} title="Share your review page" />
      <QrCard name={business.name} slug={slug} url={url} />
    </div>
  );
}
