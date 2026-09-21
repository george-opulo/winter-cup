"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Table", ico: "🏆" },
  { href: "/rounds", label: "Rounds", ico: "⛳" },
  { href: "/stats", label: "Stats", ico: "📊" },
  { href: "/wheel", label: "Wheel", ico: "🎡" },
  { href: "/admin", label: "Admin", ico: "🔒" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      <div className="nav-inner">
        {LINKS.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={active ? "active" : ""}>
              <span className="ico">{l.ico}</span>
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
