import { requireOwnerPage } from "@/lib/auth";
import { PageHeader, page } from "../ui";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ welcome?: string }> }) {
  const { slug } = await params;
  const { business } = await requireOwnerPage(slug);
  const { welcome } = await searchParams;
  return (
    <div className={page}>
      <PageHeader eyebrow={`${business.name} · Settings`} title="Settings" />
      {welcome && (
        <div className="mt-6 rounded-2xl border border-leaf bg-card p-5">
          <p className="font-display text-xl">Welcome! Your desk is ready.</p>
          <p className="mt-1 text-sm text-muted">
            Three things before you print the QR: paste your Google review link, add your menu, and check the options below. We added starter options you can change.
          </p>
        </div>
      )}
      <SettingsForm initial={business} />
    </div>
  );
}
