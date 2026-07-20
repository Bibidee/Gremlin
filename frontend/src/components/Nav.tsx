"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletBar } from "./WalletBar";

const LINKS = [
  { href: "/", label: "Lair" },
  { href: "/arena", label: "Arena" },
  { href: "/duel", label: "Duel" },
  { href: "/leaderboard", label: "Ranks" },
  { href: "/hall-of-fame", label: "Hall" },
  { href: "/feed", label: "Feed" },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="nav">
      <Link href="/" className="nav__brand">
        <span className="wallet-bar__mascot">👹</span>
        <span className="nav__title">Gremlin</span>
      </Link>
      <nav className="nav__links">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav__link ${pathname === link.href ? "nav__link--active" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <WalletBar />
    </header>
  );
}
