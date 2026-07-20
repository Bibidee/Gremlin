"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import type { Plea } from "@/lib/types";

const POLL_MS = 8000;

const MOOD_EMOJI: Record<Plea["verdict"], string> = {
  grant: "😈",
  partial: "😏",
  deny: "🙅",
};

export function Feed({
  refreshKey = 0,
  limit = 20,
  title = "The Feed",
}: {
  refreshKey?: number;
  limit?: number;
  title?: string;
}) {
  const { client } = useWallet();
  const [pleas, setPleas] = useState<Plea[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const recent = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_recent_pleas",
        args: [limit],
      });
      setPleas(((recent as unknown as Plea[]) ?? []).slice().reverse());
    } finally {
      setLoading(false);
    }
  }, [client, limit]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load, refreshKey]);

  return (
    <div className="feed">
      <div className="feed__header">
        <h2>{title}</h2>
        <button className="btn" onClick={load}>
          Refresh
        </button>
      </div>
      {loading && pleas.length === 0 && <p className="feed__empty">Loading pleas…</p>}
      {!loading && pleas.length === 0 && <p className="feed__empty">No pleas yet. Be the first to summon the Gremlin.</p>}
      <ul className="feed__list">
        {pleas.map((p, i) => (
          <li key={i} className={`feed__item feed__item--${p.verdict}`}>
            <div className="feed__item-header">
              <span>{MOOD_EMOJI[p.verdict]}</span>
              <span className="feed__item-actors">
                {shortAddress(p.pleader)} → {p.action} → {shortAddress(p.target)}
              </span>
              <span className="feed__item-amount">{p.amount} GREM</span>
            </div>
            <p className="feed__item-message">"{p.message}"</p>
            <p className="feed__item-roast">Gremlin: "{p.roast}"</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
