import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { getPayment, getReceipt } from "@/lib/store";
import { PAYMENT_METHODS, planLabel, rupees } from "@/lib/options";
import { when } from "../../../admin/[slug]/ui";
import { TopBar, shell } from "../../ui";

// Super-admin only: the receipt screenshot an owner attached to a payment.
export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSuperAdmin();
  const [payment, receipt] = await Promise.all([getPayment(id), getReceipt(id)]);
  if (!payment) notFound();
  return (
    <main className={shell}>
      <TopBar email={user.email} />
      <p className="mt-6 text-sm">
        <Link href={`/superadmin/${payment.slug}`} className="underline underline-offset-4">
          ← {payment.slug}
        </Link>
      </p>
      <h1 className="mt-3 font-display text-3xl tracking-tight">Receipt</h1>
      <p className="mt-2 text-sm">
        {planLabel(payment.plan)} · expected <span className="font-mono">{rupees(payment.amountPkr)}</span> · {PAYMENT_METHODS.find((m) => m.key === payment.method)?.label} · TID{" "}
        <span className="font-mono">{payment.reference}</span> · from {payment.payer} · {when(payment.createdAt)} · <span className="font-medium">{payment.status}</span>
      </p>
      <p className="mt-1 text-sm text-muted">Check that the amount, TID and date on the screenshot match, and that the money is in your account, before approving.</p>
      {receipt ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL from the database
        <img src={receipt} alt={`Receipt for transaction ${payment.reference}`} className="mt-5 max-h-[80vh] max-w-full rounded-xl border border-line" />
      ) : (
        <p className="mt-5 text-sm text-muted">No screenshot was attached to this payment.</p>
      )}
    </main>
  );
}
