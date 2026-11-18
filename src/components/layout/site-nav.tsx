"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

const LINKS = [
  { href: "/", label: "Home", className: "nav-wide" },
  { href: "/import", label: "Import", className: "" },
  { href: "/saved", label: "Saved", className: "" },
  { href: "/account", label: "Account", className: "nav-icon-sm" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav className="site-nav" aria-label="Main">
      {LINKS.map((link) => {
        const iconOnlyOnPhones = link.className === "nav-icon-sm";
        return (
          <Link
            key={link.href}
            href={link.href}
            className={link.className || undefined}
            aria-current={isActive(pathname, link.href) ? "page" : undefined}
          >
            {iconOnlyOnPhones ? (
              <>
                <Icon id="u-user" />
                <span className="nav-icon-sm__label">{link.label}</span>
              </>
            ) : (
              link.label
            )}
          </Link>
        );
      })}
    </nav>
  );
}
