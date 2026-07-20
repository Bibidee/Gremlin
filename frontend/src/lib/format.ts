import { hexToBytes } from "viem";
import { CalldataAddress } from "genlayer-js/types";

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Wraps a 0x-prefixed address string as a GenVM CalldataAddress so it encodes
 * as the SPECIAL_ADDR calldata type instead of a plain string. Contract methods
 * typed `addr: Address` reject plain strings with "Missing or invalid parameters". */
export function toCalldataAddress(addr: string): CalldataAddress {
  return new CalldataAddress(hexToBytes(addr as `0x${string}`));
}
