import { test, expect } from "bun:test";
import { selectActiveHostiles, selectHostiles } from "./threat";

test("hostiles are acting hp-bearing non-allies; self, allies, and scenery never", () => {
  expect(
    selectHostiles({
      viewer: 1n,
      viewerAllegianceId: 10n,
      cohabitants: [
        { entityId: 1n, hasHp: true, canAct: false, isDead: false, allegianceId: 10n }, // self
        { entityId: 2n, hasHp: true, canAct: true, isDead: false, allegianceId: 10n }, // ally
        { entityId: 3n, hasHp: true, canAct: true, isDead: false, allegianceId: 20n }, // enemy
        { entityId: 4n, hasHp: true, canAct: true, isDead: false, allegianceId: null }, // unaligned actor
        { entityId: 5n, hasHp: false, canAct: true, isDead: false, allegianceId: 20n }, // harmless
        // Attackable but will-less: a training dummy is not a threat.
        { entityId: 6n, hasHp: true, canAct: false, isDead: false, allegianceId: null },
      ],
    }),
  ).toEqual([3n, 4n]);
});

test("the fallen stay in the DISPLAY list but leave the default-target list", () => {
  const inputs = {
    viewer: 1n,
    viewerAllegianceId: 10n,
    cohabitants: [
      // A corpse keeps its (dormant) controller: combatant, not scenery.
      { entityId: 3n, hasHp: true, canAct: true, isDead: true, allegianceId: 20n },
      { entityId: 4n, hasHp: true, canAct: true, isDead: false, allegianceId: 20n },
    ],
  };
  expect(selectHostiles(inputs)).toEqual([3n, 4n]);
  expect(selectActiveHostiles(inputs)).toEqual([4n]);
});

test("no hostiles means no threat", () => {
  expect(
    selectHostiles({
      viewer: 1n,
      viewerAllegianceId: null,
      cohabitants: [
        { entityId: 1n, hasHp: true, canAct: false, isDead: false, allegianceId: null },
      ],
    }),
  ).toEqual([]);
});
