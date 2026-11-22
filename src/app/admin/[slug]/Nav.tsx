"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ITEMS = [
  { href: "", label: "Dashboard", icon: "M4 13h4v7H4zM10 4h4v16h-4zM16 9h4v11h-4z" },
  { href: "/qr", label: "QR code & link", icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" },
  { href: "/settings", label: "Settings", icon: "M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4" },
  { href: "/account", label: "Account", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
];

/** Owner desk menu: a sidebar list on large screens, a ☰ button with a drop-down panel on phones. */
export default function Nav({ slug }: { slug: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="desk-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-card transition hover:border-ink lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} />
        </svg>
      </button>

      <nav
        id="desk-menu"
        aria-label="Owner desk"
        onKeyDown={(e) => e.key === "Escape" && close()}
        className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full z-30 flex-col gap-1 border-b border-line bg-paper px-4 py-3 shadow-lg lg:static lg:mt-6 lg:flex lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
      >
        {ITEMS.map((it) => {
          const href = `/admin/${slug}${it.href}`;
          const active = path === href;
          return (
            <Link
              key={it.label}
              href={href}
              onClick={close}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition lg:py-2 ${active ? "bg-ink text-paper" : "text-muted hover:bg-card hover:text-ink"}`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={it.icon} />
              </svg>
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
