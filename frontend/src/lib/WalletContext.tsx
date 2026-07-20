"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "genlayer-js";
import { connectInjectedWallet, createReadClient } from "./genlayerClient";

const STORAGE_KEY = "gremlin_wallet_address";

interface WalletState {
  address: `0x${string}` | null;
  client: ReturnType<typeof createClient>;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

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

  // Silent reconnect on mount if wallet was previously connected
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!saved) return;

    const tryReconnect = async () => {
      try {
        const eth = window.ethereum;
        if (!eth) return;
        const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
        if (accounts.length === 0 || accounts[0].toLowerCase() !== saved.toLowerCase()) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        // Wallet is still connected — restore session without prompting
        const { client: c, address: a } = await connectInjectedWallet();
        setClient(c);
        setAddress(a);
        localStorage.setItem(STORAGE_KEY, a);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    tryReconnect();
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const { client: connectedClient, address: connectedAddress } = await connectInjectedWallet();
      setClient(connectedClient);
      setAddress(connectedAddress);
      localStorage.setItem(STORAGE_KEY, connectedAddress);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setClient(createReadClient());
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <WalletContext.Provider value={{ address, client, connecting, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
