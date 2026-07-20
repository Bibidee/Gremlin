"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import type { Plea } from "@/lib/types";

const SCAN_LIMIT = 200;
const TOP_N = 12;

export function HallOfFame() {
  const { client } = useWallet();
  const [topPleas, setTopPleas] = useState<Plea[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const recent = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_recent_pleas",
        args: [SCAN_LIMIT],
      });
      const all = ((recent as unknown as Plea[]) ?? []).filter((p) => p.amount > 0);
      all.sort((a, b) => b.amount - a.amount);
      setTopPleas(all.slice(0, TOP_N));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="feed hall-of-fame">
      <div className="feed__header">
        <h2>Biggest Verdicts</h2>
        <button className="btn" onClick={load}>
          Refresh
        </button>
      </div>
      {loading && <p className="feed__empty">Digging through the swamp…</p>}
      {!loading && topPleas.length === 0 && <p className="feed__empty">No verdicts big enough yet.</p>}
      <ol className="hall-of-fame__list">
        {topPleas.map((p, i) => (
          <li key={i} className={`feed__item feed__item--${p.verdict} hall-of-fame__item`}>
            <div className="feed__item-header">
              <span className="hall-of-fame__rank">#{i + 1}</span>
              <span>
                {shortAddress(p.pleader)} → {p.action} → {shortAddress(p.target)}
              </span>
              <span className="feed__item-amount">{p.amount} GREM</span>
            </div>
            <p className="feed__item-message">"{p.message}"</p>
            <p className="feed__item-roast">Gremlin: "{p.roast}"</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
