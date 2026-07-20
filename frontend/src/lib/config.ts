// Deployed contract address on GenLayer StudioNet (chain id 61999).
// Fill this in after running `genlayer deploy` against contracts/gremlin_bank.py.
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GREMLIN_CONTRACT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const MAX_MESSAGE_LEN = 280;
export const MAX_ACTION_AMOUNT = 50;

export const ACTIONS = [
  { value: "bless", label: "Bless (mint to target)" },
  { value: "gift", label: "Gift (send your own GREM)" },
  { value: "steal", label: "Steal (take from target)" },
  { value: "curse", label: "Curse (burn target's GREM)" },
  { value: "roast_tax", label: "Roast Tax (burn target's GREM)" },
] as const;

export type ActionValue = (typeof ACTIONS)[number]["value"];
export const SELF_TARGET_FORBIDDEN: ActionValue[] = ["steal", "curse", "roast_tax"];
