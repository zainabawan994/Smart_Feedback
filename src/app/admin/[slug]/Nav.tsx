"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "", label: "Overview", icon: "M4 13h4v7H4zM10 4h4v16h-4zM16 9h4v11h-4z" },
  { href: "/issues", label: "Issues", icon: "M12 3l9.5 17h-19zM12 10v4M12 17.5v.01" },
  { href: "/drafts", label: "Drafts", icon: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5" },
  { href: "/qr", label: "QR & table card", icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" },
  { href: "/billing", label: "Plan & billing", icon: "M3 6h18v12H3zM3 10h18M7 15h4" },
  { href: "/settings", label: "Settings", icon: "M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4" },
  { href: "/account", label: "Account", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
];

export default function Nav({ slug }: { slug: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Owner desk" className="-mx-4 mt-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:mt-6 lg:flex-col lg:px-0 [&::-webkit-scrollbar]:hidden">
      {ITEMS.map((it) => {
        const href = `/admin/${slug}${it.href}`;
        const active = path === href;
        return (
          <Link
            key={it.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-ink text-paper" : "text-muted hover:bg-card hover:text-ink"}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={it.icon} />
            </svg>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
