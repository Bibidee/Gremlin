"use client";

import { useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import { Ledger } from "@/components/Ledger";
import { PleadForm } from "@/components/PleadForm";
import { Feed } from "@/components/Feed";
import { CONTRACT_ADDRESS } from "@/lib/config";

export default function ArenaPage() {
  const { address } = useWallet();
  const [refreshKey, setRefreshKey] = useState(0);
  const unconfigured = CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000";

  return (
    <main className="page page--arena">
      {unconfigured && (
        <div className="app__banner">
          Set NEXT_PUBLIC_GREMLIN_CONTRACT_ADDRESS after deploying contracts/gremlin_bank.py to StudioNet.
        </div>
      )}
      <div className="arena-grid">
        <aside className="arena-grid__sidebar">
          <Ledger />
        </aside>
        <section className="arena-grid__center">
          <PleadForm onResolved={() => setRefreshKey((k) => k + 1)} />
        </section>
        <section className="arena-grid__feed">
          <Feed refreshKey={refreshKey} limit={20} />
        </section>
      </div>
    </main>
  );
}
