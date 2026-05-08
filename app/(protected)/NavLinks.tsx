"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/production", label: "Production", adminOnly: false },
  { href: "/saisie-soir", label: "Saisie du soir", adminOnly: false },
  { href: "/mode-emploi", label: "Mode d'emploi", adminOnly: false },
  { href: "/admin/produits", label: "Admin", adminOnly: true },
];

export default function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const visibleLinks = LINKS.filter((l) => !l.adminOnly || isAdmin);

  return (
    <nav style={{ display: "flex", gap: "4px" }}>
      {visibleLinks.map(({ href, label }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              color: isActive ? "var(--text)" : "var(--text-dim)",
              background: isActive ? "var(--bg-elev-2)" : "transparent",
              padding: "6px 12px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: isActive ? 600 : 500,
              fontSize: "13px",
              border: isActive ? "1px solid var(--border)" : "1px solid transparent",
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
