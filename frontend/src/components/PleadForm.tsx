"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import { useContractWrite } from "@/lib/useContractWrite";
import { ConsensusTrace } from "./ConsensusTrace";
import { ACTIONS, CONTRACT_ADDRESS, MAX_MESSAGE_LEN, SELF_TARGET_FORBIDDEN, type ActionValue } from "@/lib/config";
import type { Plea } from "@/lib/types";

function isPlea(v: unknown): v is Plea {
  return (
    !!v &&
    typeof v === "object" &&
    "verdict" in v &&
    "roast" in v &&
    "amount" in v
  );
}

export function PleadForm({ onResolved }: { onResolved: () => void }) {
  const { address, client } = useWallet();
  const [action, setAction] = useState<ActionValue>("bless");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [registered, setRegistered] = useState<boolean | null>(null);

  const { write, status, result, error, reset } = useContractWrite();
  const { write: writeRegister, status: regStatus, error: regError } = useContractWrite();

  const checkRegistration = useCallback(async () => {
    if (!address) { setRegistered(null); return; }
    try {
      const r = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "is_registered",
        args: [address],
      });
      setRegistered(r as boolean);
    } catch {
      setRegistered(null);
    }
  }, [address, client]);

  useEffect(() => {
    checkRegistration();
  }, [checkRegistration]);

  const register = async () => {
    await writeRegister("register", []);
    setRegistered(true);
  };

  const selfTargetBlocked =
    SELF_TARGET_FORBIDDEN.includes(action) && target.toLowerCase() === address?.toLowerCase();

  const canSubmit =
    !!address &&
    registered === true &&
    target.trim().length > 0 &&
    message.trim().length > 0 &&
    message.length <= MAX_MESSAGE_LEN &&
    !selfTargetBlocked &&
    status !== "submitted" &&
    status !== "pending";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await write("plead", [action, target, message]);
    onResolved();
  };

  const verdictResult = isPlea(result) ? result : null;

  if (address && registered === false) {
    return (
      <div className="plead-form">
        <h2>Plead your case</h2>
        <p className="plead-form__register-hint">
          You need to register before you can plead. Registration grants you 100 GREM to start.
        </p>
        <button
          className="btn btn--primary"
          onClick={register}
          disabled={regStatus === "submitted" || regStatus === "pending"}
        >
          {regStatus === "submitted" || regStatus === "pending" ? "Registering…" : "Register (get 100 GREM)"}
        </button>
        {regError && <p className="plead-form__warning">{regError}</p>}
        <ConsensusTrace status={regStatus} error={regError} />
      </div>
    );
  }

  return (
    <form className="plead-form" onSubmit={submit}>
      <h2>Plead your case</h2>

      <label className="plead-form__field">
        Action
        <select value={action} onChange={(e) => setAction(e.target.value as ActionValue)}>
          {ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </label>

      <label className="plead-form__field">
        Target address
        <input
          type="text"
          placeholder="0x…"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </label>
      {selfTargetBlocked && (
        <p className="plead-form__warning">You can't {action} yourself.</p>
      )}

      <label className="plead-form__field">
        Your plea
        <textarea
          maxLength={MAX_MESSAGE_LEN}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Convince the Gremlin..."
        />
        <span className="plead-form__counter">
          {message.length}/{MAX_MESSAGE_LEN}
        </span>
      </label>

      <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
        {status === "submitted" || status === "pending" ? "Pleading…" : "Submit plea"}
      </button>

      <ConsensusTrace status={status} error={error} />

      {verdictResult && (status === "accepted" || status === "finalized") && (
        <div className={`verdict verdict--${verdictResult.verdict}`}>
          <p className="verdict__roast">"{verdictResult.roast}"</p>
          <p className="verdict__outcome">
            {verdictResult.verdict.toUpperCase()} · {verdictResult.amount} GREM
          </p>
          <button type="button" className="btn" onClick={() => { reset(); setMessage(""); }}>
            Plead again
          </button>
        </div>
      )}
    </form>
  );
}
