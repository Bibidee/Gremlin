"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import { useContractWrite } from "@/lib/useContractWrite";
import { ConsensusTrace } from "./ConsensusTrace";
import { CONTRACT_ADDRESS, MAX_MESSAGE_LEN } from "@/lib/config";
import { shortAddress, toCalldataAddress } from "@/lib/format";
import type { Duel } from "@/lib/types";

export function DuelArena() {
  const { client, address } = useWallet();
  const [opponent, setOpponent] = useState("");
  const [challengeMessage, setChallengeMessage] = useState("");
  const challenge = useContractWrite();

  const [openDuels, setOpenDuels] = useState<Duel[]>([]);
  const [recentDuels, setRecentDuels] = useState<Duel[]>([]);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const respond = useContractWrite();

  const refresh = useCallback(async () => {
    if (!address) return;
    const [open, recent] = await Promise.all([
      client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_open_duels_for", args: [toCalldataAddress(address)] }),
      client.readContract({ address: CONTRACT_ADDRESS, functionName: "get_recent_duels", args: [15] }),
    ]);
    setOpenDuels((open as unknown as Duel[]) ?? []);
    setRecentDuels(((recent as unknown as Duel[]) ?? []).slice().reverse());
  }, [client, address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (challenge.status === "accepted" || challenge.status === "finalized") refresh();
    if (respond.status === "accepted" || respond.status === "finalized") {
      refresh();
      setRespondingTo(null);
      setResponseMessage("");
    }
  }, [challenge.status, respond.status, refresh]);

  const canChallenge =
    !!address &&
    opponent.trim().length > 0 &&
    opponent.toLowerCase() !== address.toLowerCase() &&
    challengeMessage.trim().length > 0 &&
    challengeMessage.length <= MAX_MESSAGE_LEN &&
    challenge.status !== "submitted" &&
    challenge.status !== "pending";

  const sendChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canChallenge) return;
    await challenge.write("challenge_duel", [toCalldataAddress(opponent), challengeMessage]);
    setChallengeMessage("");
  };

  const sendResponse = async (duelId: number) => {
    if (!responseMessage.trim() || responseMessage.length > MAX_MESSAGE_LEN) return;
    await respond.write("accept_duel", [duelId, responseMessage]);
  };

  if (!address) {
    return <div className="app__connect-hint">Connect a wallet (MetaMask or Rabby) to enter a duel.</div>;
  }

  return (
    <div className="duel-arena">
      <form className="plead-form" onSubmit={sendChallenge}>
        <h2>Challenge a Duel</h2>
        <label className="plead-form__field">
          Opponent address
          <input type="text" placeholder="0x…" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
        </label>
        <label className="plead-form__field">
          Your opening line
          <textarea
            maxLength={MAX_MESSAGE_LEN}
            rows={3}
            value={challengeMessage}
            onChange={(e) => setChallengeMessage(e.target.value)}
            placeholder="Talk your trash..."
          />
          <span className="plead-form__counter">
            {challengeMessage.length}/{MAX_MESSAGE_LEN}
          </span>
        </label>
        <button type="submit" className="btn btn--primary" disabled={!canChallenge}>
          {challenge.status === "submitted" || challenge.status === "pending" ? "Challenging…" : "Send challenge"}
        </button>
        <ConsensusTrace status={challenge.status} error={challenge.error} />
      </form>

      {openDuels.length > 0 && (
        <div className="feed duel-arena__open">
          <h2>Duels waiting on you</h2>
          <ul className="feed__list">
            {openDuels.map((d) => (
              <li key={d.id} className="feed__item">
                <div className="feed__item-header">
                  <span>⚔️</span>
                  <span>{shortAddress(d.challenger)} challenges you</span>
                </div>
                <p className="feed__item-message">"{d.challenger_message}"</p>
                {respondingTo === d.id ? (
                  <div className="duel-arena__response">
                    <textarea
                      maxLength={MAX_MESSAGE_LEN}
                      rows={2}
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      placeholder="Your comeback..."
                    />
                    <div className="duel-arena__response-actions">
                      <button
                        className="btn btn--primary"
                        onClick={() => sendResponse(d.id)}
                        disabled={respond.status === "submitted" || respond.status === "pending"}
                      >
                        {respond.status === "submitted" || respond.status === "pending" ? "Judging…" : "Accept & respond"}
                      </button>
                      <button className="btn" onClick={() => setRespondingTo(null)}>
                        Cancel
                      </button>
                    </div>
                    <ConsensusTrace status={respond.status} error={respond.error} />
                  </div>
                ) : (
                  <button className="btn btn--primary" onClick={() => setRespondingTo(d.id)}>
                    Accept duel
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="feed">
        <div className="feed__header">
          <h2>Recent Duels</h2>
          <button className="btn" onClick={refresh}>
            Refresh
          </button>
        </div>
        {recentDuels.length === 0 && <p className="feed__empty">No duels fought yet.</p>}
        <ul className="feed__list">
          {recentDuels.map((d) => (
            <li key={d.id} className={`feed__item ${d.status === "resolved" ? `feed__item--${d.verdict === "draw" ? "partial" : "grant"}` : ""}`}>
              <div className="feed__item-header">
                <span>⚔️</span>
                <span>
                  {shortAddress(d.challenger)} vs {shortAddress(d.opponent)}
                </span>
                {d.status === "resolved" && <span className="feed__item-amount">{d.amount} GREM</span>}
              </div>
              <p className="feed__item-message">"{d.challenger_message}"</p>
              {d.status === "resolved" && (
                <>
                  <p className="feed__item-message">"{d.opponent_message}"</p>
                  <p className="feed__item-roast">
                    Gremlin: "{d.roast}" · {d.verdict === "draw" ? "Draw" : `${shortAddress(d.winner)} wins`}
                  </p>
                </>
              )}
              {d.status === "pending" && <p className="feed__empty">Awaiting response…</p>}
              {d.status === "declined" && <p className="feed__empty">Declined.</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
