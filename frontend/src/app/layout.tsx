import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WalletProvider } from "@/lib/WalletContext";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gremlin — GREM Bank",
  description:
    "A shared token ledger where the only way to move money is to talk a mischievous AI banker into it. Built on GenLayer.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Creepster&family=JetBrains+Mono:wght@400;600;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <WalletProvider>
          <div className="app">
            <Nav />
            {children}
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
