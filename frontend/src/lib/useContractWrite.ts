"use client";

import { useCallback, useState } from "react";
import { TransactionStatus } from "genlayer-js/types";
import type { CalldataEncodable } from "genlayer-js/types";
import { useWallet } from "./WalletContext";
import { CONTRACT_ADDRESS } from "./config";
import type { TxUiStatus } from "./types";

const STATUS_MAP: Record<string, TxUiStatus> = {
  [TransactionStatus.PENDING]: "pending",
  [TransactionStatus.PROPOSING]: "proposing",
  [TransactionStatus.COMMITTING]: "committing",
  [TransactionStatus.REVEALING]: "revealing",
  [TransactionStatus.ACCEPTED]: "accepted",
  [TransactionStatus.FINALIZED]: "finalized",
  [TransactionStatus.UNDETERMINED]: "undetermined",
  [TransactionStatus.CANCELED]: "canceled",
};

export function useContractWrite() {
  const { client, address } = useWallet();
  const [status, setStatus] = useState<TxUiStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const write = useCallback(
    async (functionName: string, args: CalldataEncodable[]) => {
      if (!address) {
        setError("Connect a wallet first");
        return null;
      }
      setError(null);
      setResult(null);
      setStatus("submitted");
      try {
        const hash = await client.writeContract({
          address: CONTRACT_ADDRESS,
          functionName,
          args,
          value: 0n,
        });
        setTxHash(hash);
        setStatus("pending");

        const receipt = await client.waitForTransactionReceipt({
          hash,
          status: TransactionStatus.ACCEPTED,
        });

        const mapped = STATUS_MAP[(receipt as { status?: string })?.status ?? ""] ?? "accepted";
        setStatus(mapped);
        setResult((receipt as { result?: unknown })?.result ?? receipt);
        return receipt;
      } catch (err) {
        setStatus("failed");
        let msg = "Transaction failed";
        if (err instanceof Error) {
          msg = err.message;
        } else if (err && typeof err === "object") {
          const e = err as Record<string, unknown>;
          // GenLayer surfaces contract UserErrors as { message } or nested { error: { message } }
          if (typeof e.message === "string") msg = e.message;
          else if (e.error && typeof (e.error as Record<string, unknown>).message === "string")
            msg = (e.error as Record<string, unknown>).message as string;
        } else if (typeof err === "string") {
          msg = err;
        }
        setError(msg);
        return null;
      }
    },
    [client, address],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
    setResult(null);
    setError(null);
  }, []);

  return { write, status, txHash, result, error, reset };
}
