"use client";

import { useWallet } from "@/lib/WalletContext";

export function WalletBar() {
  const { address, connecting, error, connect } = useWallet();

  return (
    <div className="wallet-bar__actions">
      {address ? (
        <span className="wallet-bar__address" title={address}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
      ) : (
        <button className="btn btn--primary" onClick={connect} disabled={connecting}>
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>
      )}
      {error && <span className="wallet-bar__error">{error}</span>}
    </div>
  );
}
