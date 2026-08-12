import { test, expect } from "bun:test";
import { selectHostiles } from "./threat";

test("hostiles are acting hp-bearing non-allies; self, allies, and scenery never", () => {
  expect(
    selectHostiles({
      viewer: 1n,
      viewerAllegianceId: 10n,
      cohabitants: [
        { entityId: 1n, hasHp: true, canAct: false, allegianceId: 10n }, // self
        { entityId: 2n, hasHp: true, canAct: true, allegianceId: 10n }, // ally
        { entityId: 3n, hasHp: true, canAct: true, allegianceId: 20n }, // enemy
        { entityId: 4n, hasHp: true, canAct: true, allegianceId: null }, // unaligned actor
        { entityId: 5n, hasHp: false, canAct: true, allegianceId: 20n }, // harmless
        // Attackable but will-less: a training dummy is not a threat.
        { entityId: 6n, hasHp: true, canAct: false, allegianceId: null },
      ],
    }),
  ).toEqual([3n, 4n]);
});

test("no hostiles means no threat", () => {
  expect(
    selectHostiles({
      viewer: 1n,
      viewerAllegianceId: null,
      cohabitants: [
        { entityId: 1n, hasHp: true, canAct: false, allegianceId: null },
      ],
    }),
  ).toEqual([]);
});
