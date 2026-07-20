"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { useContractWrite } from "@/lib/useContractWrite";

export function Ledger() {
  const { client, address } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [pleaCount, setPleaCount] = useState<number | null>(null);
  const [registered, setRegistered] = useState<boolean | null>(null);
  const { write, status, error } = useContractWrite();

  const refresh = useCallback(async () => {
    if (!address) return;
    const [bal, count, isReg] = await Promise.all([
      client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_balance", args: [address] }),
      client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_plea_count", args: [address] }),
      client.readContract({ address: CONTRACT_ADDRESS, functionName: "is_registered", args: [address] }),
    ]);
    setBalance(bal as number);
    setPleaCount(count as number);
    setRegistered(isReg as boolean);
  }, [client, address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (status === "finalized" || status === "accepted") {
      refresh();
    }
  }, [status, refresh]);

  if (!address) {
    return <div className="ledger ledger--empty">Connect your wallet to see your ledger.</div>;
  }

  return (
    <div className="ledger">
      <h2>Your Ledger</h2>
      {registered === false ? (
        <button className="btn btn--primary" onClick={() => write("register", [])} disabled={status === "submitted" || status === "pending"}>
          {status === "submitted" || status === "pending" ? "Registering…" : "Register (get 100 GREM)"}
        </button>
      ) : (
        <>
          <div className="ledger__stat">
            <span className="ledger__label">Balance</span>
            <span className="ledger__value">{balance ?? "…"} GREM</span>
          </div>
          <div className="ledger__stat">
            <span className="ledger__label">Pleas made</span>
            <span className="ledger__value">{pleaCount ?? "…"}</span>
          </div>
        </>
      )}
      {error && <div className="ledger__error">{error}</div>}
    </div>
  );
}
