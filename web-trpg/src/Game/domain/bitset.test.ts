import { test, expect } from "bun:test";
import type { Bitset } from "../../stdb/types";
import { bitIsSet, countOnes } from "./bitset";

const bitset = (...bytes: number[]): Bitset => ({
  bytes: Uint8Array.from(bytes),
});

// Mirrors the server primitive's tests: same addressing, same answers.
test("bits read back across byte boundaries", () => {
  // Bits 0, 7, 8, 63 set — matching the server-side test exactly.
  const bits = bitset(0b1000_0001, 0b0000_0001, 0, 0, 0, 0, 0, 0b1000_0000);
  expect(bitIsSet(bits, 0)).toBe(true);
  expect(bitIsSet(bits, 7)).toBe(true);
  expect(bitIsSet(bits, 8)).toBe(true);
  expect(bitIsSet(bits, 63)).toBe(true);
  expect(bitIsSet(bits, 1)).toBe(false);
  expect(bitIsSet(bits, 9)).toBe(false);
  expect(bitIsSet(bits, 62)).toBe(false);
});

test("out-of-range bits read as unset", () => {
  expect(bitIsSet(bitset(), 0)).toBe(false);
  expect(bitIsSet(bitset(0xff), 10_000)).toBe(false);
});

test("countOnes is the popcount", () => {
  expect(countOnes(bitset())).toBe(0);
  expect(countOnes(bitset(0b0000_1000, 0, 0b0000_0001))).toBe(2);
  expect(countOnes(bitset(0xff))).toBe(8);
});
