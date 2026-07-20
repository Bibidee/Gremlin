"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { createClient } from "genlayer-js";
import { connectInjectedWallet, createReadClient } from "./genlayerClient";

interface WalletState {
  address: `0x${string}` | null;
  client: ReturnType<typeof createClient>;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);

/** Wallet/RPC rejections often arrive as plain objects ({ code, message }) rather
 * than Error instances, so pull the message out defensively instead of falling
 * back to a generic string that hides the real cause. */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Failed to connect wallet";
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [client, setClient] = useState<ReturnType<typeof createClient>>(() => createReadClient());
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const { client: connectedClient, address: connectedAddress } = await connectInjectedWallet();
      setClient(connectedClient);
      setAddress(connectedAddress);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setConnecting(false);
    }
  }, []);

  return (
    <WalletContext.Provider value={{ address, client, connecting, error, connect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
