import type { Bitset } from "../../stdb/types";

/**
 * Client method implementations over the GENERATED Bitset wire type
 * (server/src/bitset.rs owns the primitive): the SAME addressing — least
 * significant bit of byte 0 first — so a quest-progress row reads
 * identically on both sides. Pure and read-only: the client never mutates
 * bits, it only asks.
 */
export const bitIsSet = (bitset: Bitset, index: number): boolean => {
  const byteIndex = Math.floor(index / 8);
  const byte = byteIndex < bitset.bytes.length ? bitset.bytes[byteIndex] : 0;
  return (byte & (1 << index % 8)) !== 0;
};

export const countOnes = (bitset: Bitset): number => {
  let total = 0;
  for (const byteValue of bitset.bytes) {
    let byte = byteValue;
    while (byte !== 0) {
      total += byte & 1;
      byte >>>= 1;
    }
  }
  return total;
};
