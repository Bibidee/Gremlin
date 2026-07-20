export type TxUiStatus =
  | "idle"
  | "submitted"
  | "pending"
  | "proposing"
  | "committing"
  | "revealing"
  | "accepted"
  | "finalized"
  | "undetermined"
  | "canceled"
  | "failed";

export interface Plea {
  pleader: string;
  target: string;
  action: string;
  message: string;
  verdict: "grant" | "partial" | "deny";
  roast: string;
  amount: number;
}

export interface Duel {
  id: number;
  challenger: string;
  opponent: string;
  challenger_message: string;
  opponent_message: string;
  status: "pending" | "resolved" | "declined";
  verdict: "" | "challenger" | "opponent" | "draw";
  winner: string;
  roast: string;
  amount: number;
}

export interface BalanceLeaderboardRow {
  address: string;
  balance: number;
}

export interface HeistLeaderboardRow {
  address: string;
  total_heisted: number;
}

export interface TargetedLeaderboardRow {
  address: string;
  times_targeted: number;
}
