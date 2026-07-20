"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  const [open, setOpen] = useState(false);

  return (
    <header className="nav">
      <Link href="/" className="nav__brand" onClick={() => setOpen(false)}>
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

      <button
        className="nav__burger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`nav__burger-bar ${open ? "nav__burger-bar--open" : ""}`} />
        <span className={`nav__burger-bar ${open ? "nav__burger-bar--open" : ""}`} />
        <span className={`nav__burger-bar ${open ? "nav__burger-bar--open" : ""}`} />
      </button>

      {open && (
        <nav className="nav__drawer">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav__drawer-link ${pathname === link.href ? "nav__link--active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
