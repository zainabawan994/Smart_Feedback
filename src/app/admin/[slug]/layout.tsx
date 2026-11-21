import Link from "next/link";
import { requireOwnerPage } from "@/lib/auth";
import { listBusinesses } from "@/lib/store";
import { logout } from "@/lib/actions";
import Nav from "./Nav";

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, business } = await requireOwnerPage(slug);
  const all = await listBusinesses(user.id);

  const switcher = (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl border border-line bg-card px-3 py-2.5 transition hover:border-ink [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block truncate font-display text-lg leading-tight">{business.name}</span>
          <span className="block truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{business.city}</span>
        </span>
        <span aria-hidden className="text-muted transition group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-card shadow-lg">
        {all.map((b) => (
          <Link key={b.slug} href={`/admin/${b.slug}`} className={`block px-3 py-2 text-sm hover:bg-paper ${b.slug === slug ? "font-medium" : ""}`}>
            {b.name} <span className="text-muted">· {b.city}</span>
          </Link>
        ))}
        <Link href="/admin/new" className="block border-t border-line px-3 py-2 text-sm text-tomato hover:bg-paper">
          + Add a business
        </Link>
      </div>
    </details>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="border-b border-line px-4 py-4 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <div className="flex items-center justify-between gap-3 lg:block">
          <Link href="/" className="shrink-0 font-display text-xl tracking-tight">
            Smart<span className="text-tomato">Feedback</span>
          </Link>
          <div className="w-52 lg:mt-6 lg:w-auto">{switcher}</div>
        </div>
        <Nav slug={slug} />
        <div className="hidden lg:mt-auto lg:block">
          <a href={`/r/${slug}`} target="_blank" className="block rounded-xl border border-ink px-3 py-2 text-center text-sm transition hover:bg-ink hover:text-paper">
            Customer page ↗
          </a>
          <div className="dashed my-4" />
          <p className="truncate text-xs text-muted" title={user.email}>
            {user.email}
          </p>
          <form action={logout}>
            <button className="mt-1 text-sm underline decoration-line underline-offset-4 hover:decoration-ink">Log out</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        {children}
        <div className="flex items-center justify-between border-t border-line px-4 py-4 text-sm lg:hidden">
          <a href={`/r/${slug}`} target="_blank" className="underline underline-offset-4">
            Customer page ↗
          </a>
          <form action={logout}>
            <button className="text-muted underline underline-offset-4">Log out</button>
          </form>
        </div>
      </div>
    </div>
  );
}
