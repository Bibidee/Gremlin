"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { useContractWrite } from "@/lib/useContractWrite";

function regKey(address: string) {
  return `gremlin_registered_${address.toLowerCase()}`;
}

export function Ledger() {
  const { client, address } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [pleaCount, setPleaCount] = useState<number | null>(null);

  // Seed from localStorage so registration survives page refresh
  const [registered, setRegistered] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    // We don't have address yet at init time — checked again in useEffect
    return false;
  });

  const { write, status, error } = useContractWrite();

  const markRegistered = useCallback((addr: string) => {
    setRegistered(true);
    localStorage.setItem(regKey(addr), "1");
  }, []);

  // On mount / address change: check localStorage first, then RPC
  useEffect(() => {
    if (!address) return;
    if (localStorage.getItem(regKey(address)) === "1") {
      setRegistered(true);
      return;
    }
    // Not in cache — ask the contract
    client
      .readContract({ address: CONTRACT_ADDRESS, functionName: "is_registered", args: [address] })
      .then((r) => {
        if (r) markRegistered(address);
        else setRegistered(false);
      })
      .catch(() => setRegistered(false));
  }, [address, client, markRegistered]);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      const [bal, count] = await Promise.all([
        client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_balance", args: [address] }),
        client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_plea_count", args: [address] }),
      ]);
      setBalance(bal as number);
      setPleaCount(count as number);
    } catch {
      // leave stale values
    }
  }, [client, address]);

  useEffect(() => {
    if (registered) refresh();
  }, [registered, refresh]);

  useEffect(() => {
    if (status === "finalized" || status === "accepted") refresh();
  }, [status, refresh]);

  const handleRegister = async () => {
    const receipt = await write("register", []);
    if (receipt && address) {
      markRegistered(address);
      refresh();
    }
  };

  if (!address) {
    return <div className="ledger ledger--empty">Connect your wallet to see your ledger.</div>;
  }

  if (!registered) {
    return (
      <div className="ledger">
        <h2>Your Ledger</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Register to claim your starting 100 GREM.
        </p>
        <button
          className="btn btn--primary"
          onClick={handleRegister}
          disabled={status === "submitted" || status === "pending"}
        >
          {status === "submitted" || status === "pending" ? "Registering…" : "Register (get 100 GREM)"}
        </button>
        {error && <div className="ledger__error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="ledger">
      <h2>Your Ledger</h2>
      <div className="ledger__stat">
        <span className="ledger__label">Balance</span>
        <span className="ledger__value">{balance ?? "…"} GREM</span>
      </div>
      <div className="ledger__stat">
        <span className="ledger__label">Pleas made</span>
        <span className="ledger__value">{pleaCount ?? "…"}</span>
      </div>
      {error && <div className="ledger__error">{error}</div>}
    </div>
  );
}
