import { test, expect } from "bun:test";
import {
  nonZeroStats,
  signedStatSummary,
  summedStats,
  totalStatSummary,
  IntStats,
  STAT_KEYS,
} from "./statSummary";

const zeroes = Object.fromEntries(STAT_KEYS.map((key) => [key, 0])) as IntStats;

test("only the non-zero elements summarize, in canonical order", () => {
  expect(
    nonZeroStats({ ...zeroes, gait: -1, mhp: 2, bladed: 1 }).map((s) => s.key),
  ).toEqual(["mhp", "gait", "bladed"]);
  expect(nonZeroStats(zeroes)).toEqual([]);
});

test("deltas are signed; totals are plain", () => {
  const block = { ...zeroes, mhp: 2, gait: -1 };
  expect(signedStatSummary(block)).toBe("+2 mhp, -1 gait");
  expect(totalStatSummary(block)).toBe("mhp 2, gait -1");
  expect(signedStatSummary(zeroes)).toBe("");
});

test("summedStats folds a gear set into one contribution", () => {
  const sword = { ...zeroes, bladed: 1, hand: -1 };
  const charm = { ...zeroes, attack: 1 };
  expect(signedStatSummary(summedStats([sword, charm, charm]))).toBe(
    "+2 attack, -1 hand, +1 bladed",
  );
});
