import { CreatureAssetShort } from "../types/creature";

/** The creature roster as a tuple-matrix pseudo-table: each row is
 * [name, ...creatureShort]. PURE DATA — no builder calls, and every
 * cross-reference is a name only, so this module could later be a data file fed
 * through zod. Hydrated once by the glue (bundle/creature.ts); the builder is
 * never called per asset. */
export const CREATURE_ROWS = [
  ["slime", "slime", "amorphous"],
  ["slimeSmall", "slime", "amorphous", { traits: ["small"] }],
  ["slimeBig", "slime", "amorphous", { traits: ["big"] }],
  ["bat", "bat", "flapping"],
  ["batBig", "bat", "flapping", { traits: ["big"] }],
  ["batPerched", "bat", "perched"],
  ["ogreWanderer", "ogre", "striding", { armaments: ["club"] }],
  ["rat", "rat", "standing"],
  // Wolves draw a distinct trait palette per pack (brawny/rangy/scrawny/
  // scarred), so a pack reads as individuals instead of "wolf 1-4".
  ["wolf", "wolf", "striding", { traitPalette: "wolf_variety" }],
  ["wolfBig", "wolf", "striding", { traits: ["big"], traitPalette: "wolf_variety" }],
  // Bandits and skeletons fight with what they carry: the armament grants
  // the attack, the stance shapes the fight.
  ["banditClubber", "bandit", "standing", { armaments: ["club"] }],
  ["banditDuelist", "bandit", "dueling", { armaments: ["dagger"] }],
  ["banditWarden", "bandit", "ready", { armaments: ["club", "shield"] }],
  // Natures ride bodies: a skeleton is a human body with the skeletal
  // nature, and any element can ride any body. The natures are
  // appearance-only until the damage attribute system lands.
  ["skeletonGuard", "human", "ready", { traits: ["skeletal"], armaments: ["spear"] }],
  ["skeletonDuelist", "human", "dueling", { traits: ["skeletal"], armaments: ["sword"] }],
  ["zombieShambler", "human", "standing", { traits: ["zombie"], armaments: ["club"] }],
  ["vampireStalker", "human", "dueling", { traits: ["vampire"], armaments: ["dagger"] }],
  ["fireImp", "imp", "fire_casting", { traits: ["fire_nature"] }],
  ["iceSprite", "sprite", "ice_casting", { traits: ["ice_nature"] }],
  ["stormWisp", "wisp", "lightning_casting", { traits: ["lightning_nature"] }],
  ["ghostWisp", "wisp", "lightning_casting", { traits: ["ghost"] }],
  // The warden of the old keep: a boss, spawned only by its quest's room
  // claim — never through the wandering-encounter sampler.
  ["ogreKeepWarden", "ogre", "ready", { traits: ["big"], armaments: ["club", "shield"] }],
] as const satisfies readonly (readonly [name: string, ...CreatureAssetShort])[];
