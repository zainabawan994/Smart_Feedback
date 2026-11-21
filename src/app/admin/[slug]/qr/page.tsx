import { headers } from "next/headers";
import { requireOwnerPage } from "@/lib/auth";
import { stationKey } from "@/lib/secret";
import { PageHeader, card, page } from "../ui";
import QrCard from "./QrCard";

export default async function QrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { business } = await requireOwnerPage(slug);
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/r/${slug}`;
  return (
    <div className={page}>
      <PageHeader eyebrow={`${business.name} · QR & table card`} title="Put it on every table" />
      <QrCard name={business.name} slug={slug} url={url} />
      <section className={`${card} mt-8`}>
        <h2 className="font-display text-2xl">Feedback station (ESP32)</h2>
        <p className="mt-1 text-sm text-muted">
          A box with three buttons at the counter. Each press shows up on your Overview. Put these values in the station&apos;s code
          (see <span className="font-mono">hardware/esp32-station</span>). Keep the key private.
        </p>
        <dl className="mt-4 grid gap-2 font-mono text-sm">
          <div><dt className="inline text-muted">SERVER_URL </dt><dd className="inline break-all">{`${url.split("/r/")[0]}/api/station`}</dd></div>
          <div><dt className="inline text-muted">SLUG </dt><dd className="inline">{slug}</dd></div>
          <div><dt className="inline text-muted">STATION_KEY </dt><dd className="inline break-all">{stationKey(slug)}</dd></div>
        </dl>
      </section>
    </div>
  );
}
