"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { shortAddress } from "@/lib/format";
import type { BalanceLeaderboardRow, HeistLeaderboardRow, TargetedLeaderboardRow } from "@/lib/types";

type Tab = "balances" | "heists" | "targeted";

const TABS: { key: Tab; label: string }[] = [
  { key: "balances", label: "Richest Gremlins" },
  { key: "heists", label: "Biggest Heisters" },
  { key: "targeted", label: "Most Roasted" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard() {
  const { client } = useWallet();
  const [tab, setTab] = useState<Tab>("balances");
  const [balances, setBalances] = useState<BalanceLeaderboardRow[]>([]);
  const [heists, setHeists] = useState<HeistLeaderboardRow[]>([]);
  const [targeted, setTargeted] = useState<TargetedLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, h, t] = await Promise.all([
        client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_leaderboard_balances", args: [10] }),
        client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_leaderboard_heists", args: [10] }),
        client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_leaderboard_targeted", args: [10] }),
      ]);
      setBalances((b as unknown as BalanceLeaderboardRow[]) ?? []);
      setHeists((h as unknown as HeistLeaderboardRow[]) ?? []);
      setTargeted((t as unknown as TargetedLeaderboardRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="feed leaderboard">
      <div className="feed__header">
        <div className="leaderboard__tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`btn leaderboard__tab ${tab === t.key ? "leaderboard__tab--active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="btn" onClick={load}>
          Refresh
        </button>
      </div>

      {loading && <p className="feed__empty">Loading ranks…</p>}

      {!loading && tab === "balances" && (
        <ol className="leaderboard__list">
          {balances.length === 0 && <p className="feed__empty">Nobody's registered yet.</p>}
          {balances.map((row, i) => (
            <li key={row.address} className="leaderboard__row">
              <span className="leaderboard__rank">{MEDALS[i] ?? `#${i + 1}`}</span>
              <span className="leaderboard__addr">{shortAddress(row.address)}</span>
              <span className="leaderboard__value">{row.balance} GREM</span>
            </li>
          ))}
        </ol>
      )}

      {!loading && tab === "heists" && (
        <ol className="leaderboard__list">
          {heists.length === 0 && <p className="feed__empty">No heists pulled off yet.</p>}
          {heists.map((row, i) => (
            <li key={row.address} className="leaderboard__row">
              <span className="leaderboard__rank">{MEDALS[i] ?? `#${i + 1}`}</span>
              <span className="leaderboard__addr">{shortAddress(row.address)}</span>
              <span className="leaderboard__value">{row.total_heisted} GREM stolen</span>
            </li>
          ))}
        </ol>
      )}

      {!loading && tab === "targeted" && (
        <ol className="leaderboard__list">
          {targeted.length === 0 && <p className="feed__empty">Nobody's been cursed yet.</p>}
          {targeted.map((row, i) => (
            <li key={row.address} className="leaderboard__row">
              <span className="leaderboard__rank">{MEDALS[i] ?? `#${i + 1}`}</span>
              <span className="leaderboard__addr">{shortAddress(row.address)}</span>
              <span className="leaderboard__value">{row.times_targeted}x targeted</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
