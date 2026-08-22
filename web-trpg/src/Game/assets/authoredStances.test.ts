import { test, expect } from "bun:test";
import type { ReadinessBlock, EntityBlobAsset } from "../../stdb/types";
import { addBlock, ZERO_READINESS } from "../domain/statBlock";
import { meetsRequirements } from "../domain/statSummary";
import { BASELINES } from "./baselines";
import { TRAITS } from "./traits";
import { ARMAMENTS } from "./armaments";
import { STANCES, StanceName } from "./stances";
import { ENCOUNTER_BLOBS } from "./encounters";
import { NEW_PLAYER_BLOB } from "./entity_blobs";

// Body composition gates posture: a stance is adoptable only when the BODY's
// stance-free readiness (baseline + traits + wielded armaments) meets the
// stance's requirements. `foot` gates the upright stances, `amorphous` the
// formless one, `wing` the airborne ones — so a human cannot pour itself
// amorphous and a slime cannot stand. This suite is the guard for that gap: an
// authored body must be able to HOLD the stance it is authored into, and the
// gates must actually refuse the mismatched bodies.

/** The stance-free readiness an authored body carries: its baseline plus every
 * trait and wielded armament. Mirrors the server's stance-adoption check, which
 * tests a stance's requirements against exactly this (never the target stance's
 * own grant). Armament body-capacity fit is not modeled — authored loadouts are
 * built to fit — so this sums every armament's readiness contribution. */
const bodyReadiness = (blob: EntityBlobAsset): ReadinessBlock => {
  let total = ZERO_READINESS;
  const baseline =
    blob.baselineName && BASELINES[blob.baselineName as keyof typeof BASELINES];
  if (baseline) {
    total = addBlock(total, baseline.readiness);
  }
  for (const name of blob.traitNames ?? []) {
    const trait = TRAITS[name as keyof typeof TRAITS];
    if (trait) {
      total = addBlock(total, trait.readiness);
    }
  }
  for (const name of blob.armamentNames ?? []) {
    const armament = ARMAMENTS[name as keyof typeof ARMAMENTS];
    if (armament) {
      total = addBlock(total, armament.block.readiness);
    }
  }
  return total;
};

const allBlobs: [string, EntityBlobAsset][] = [
  ["new_player", NEW_PLAYER_BLOB],
  ...Object.entries(ENCOUNTER_BLOBS),
];
const authoredBodies = allBlobs.filter(
  ([, blob]) => blob.baselineName != null && blob.stanceName != null,
);

for (const [name, blob] of authoredBodies) {
  test(`${name}'s body can hold its authored stance (${blob.stanceName})`, () => {
    const stance = STANCES[blob.stanceName as StanceName];
    expect(meetsRequirements(bodyReadiness(blob), stance.requirements)).toBe(
      true,
    );
  });
}

test("a human body cannot pour itself amorphous", () => {
  expect(
    meetsRequirements(BASELINES.human.readiness, STANCES.amorphous.requirements),
  ).toBe(false);
});

test("a slime cannot stand, sit, or ready — it has no feet", () => {
  const slime = BASELINES.slime.readiness;
  expect(meetsRequirements(slime, STANCES.standing.requirements)).toBe(false);
  expect(meetsRequirements(slime, STANCES.sitting.requirements)).toBe(false);
  expect(meetsRequirements(slime, STANCES.ready.requirements)).toBe(false);
});

test("a footed body cannot perch or flap — it has no wings", () => {
  expect(
    meetsRequirements(BASELINES.human.readiness, STANCES.perched.requirements),
  ).toBe(false);
  expect(
    meetsRequirements(BASELINES.human.readiness, STANCES.flapping.requirements),
  ).toBe(false);
});

test("only an ethereal being can go intangible", () => {
  expect(
    meetsRequirements(BASELINES.sprite.readiness, STANCES.intangible.requirements),
  ).toBe(true);
  expect(
    meetsRequirements(BASELINES.wisp.readiness, STANCES.intangible.requirements),
  ).toBe(true);
  expect(
    meetsRequirements(BASELINES.human.readiness, STANCES.intangible.requirements),
  ).toBe(false);
});
