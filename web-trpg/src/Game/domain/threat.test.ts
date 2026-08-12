import { test, expect } from "bun:test";
import { selectHostiles } from "./threat";

test("hostiles are hp-bearing non-allies; self and allies are never hostile", () => {
  expect(
    selectHostiles({
      viewer: 1n,
      viewerAllegianceId: 10n,
      cohabitants: [
        { entityId: 1n, hasHp: true, allegianceId: 10n }, // self
        { entityId: 2n, hasHp: true, allegianceId: 10n }, // ally
        { entityId: 3n, hasHp: true, allegianceId: 20n }, // enemy
        { entityId: 4n, hasHp: true, allegianceId: null }, // unaligned hp-bearer
        { entityId: 5n, hasHp: false, allegianceId: 20n }, // harmless scenery
      ],
    }),
  ).toEqual([3n, 4n]);
});

test("no hostiles means no threat", () => {
  expect(
    selectHostiles({
      viewer: 1n,
      viewerAllegianceId: null,
      cohabitants: [{ entityId: 1n, hasHp: true, allegianceId: null }],
    }),
  ).toEqual([]);
});
