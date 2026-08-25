import { EncounterAsset, EntityBlobAsset } from "../../stdb/types";
import { creature } from "./creature";
import { blob } from "./entity_blobs";

export const ENCOUNTER_BLOBS = {
  /* TODO Add enemy allegiance component */
  // The categoric blob merged into every encounter member: the enemy
  // controller marks it a threat. Its HP/EP/etc. derive from its baseline like
  // any body's — no opt-in flag. Not a creature (no body of its own); it stays
  // a bare fragment.
  // ABSOLUTELY immobile: the player alone moves between rooms; every
  // controlled enemy holds its ground. The flag cancels any Move effect and
  // keeps the enemy AI from ever selecting a movement action. Riding the
  // categoric blob stamps it on every encounter member in one place.
  encounter_enemy: blob({ enemyController: {}, immobile: {} }),
  slime: creature("slime", "amorphous"),
  slimeSmall: creature("slime", "amorphous", { traits: ["small"] }),
  slimeBig: creature("slime", "amorphous", { traits: ["big"] }),
  bat: creature("bat", "flapping"),
  batBig: creature("bat", "flapping", { traits: ["big"] }),
  batPerched: creature("bat", "perched"),
  ogreWanderer: creature("ogre", "striding", { armaments: ["club"] }),
  rat: creature("rat", "standing"),
  // Wolves draw a distinct trait palette per pack (brawny/rangy/scrawny/
  // scarred), so a pack reads as individuals instead of "wolf 1-4".
  wolf: creature("wolf", "striding", { traitPalette: "wolf_variety" }),
  wolfBig: creature("wolf", "striding", {
    traits: ["big"],
    traitPalette: "wolf_variety",
  }),
  // Bandits and skeletons fight with what they carry: the armament grants
  // the attack, the stance shapes the fight.
  banditClubber: creature("bandit", "standing", { armaments: ["club"] }),
  banditDuelist: creature("bandit", "dueling", { armaments: ["dagger"] }),
  banditWarden: creature("bandit", "ready", { armaments: ["club", "shield"] }),
  // Natures ride bodies: a skeleton is a human body with the skeletal
  // nature, and any element can ride any body. The natures are
  // appearance-only until the damage attribute system lands.
  skeletonGuard: creature("human", "ready", {
    traits: ["skeletal"],
    armaments: ["spear"],
  }),
  skeletonDuelist: creature("human", "dueling", {
    traits: ["skeletal"],
    armaments: ["sword"],
  }),
  zombieShambler: creature("human", "standing", {
    traits: ["zombie"],
    armaments: ["club"],
  }),
  vampireStalker: creature("human", "dueling", {
    traits: ["vampire"],
    armaments: ["dagger"],
  }),
  fireImp: creature("imp", "fire_casting", { traits: ["fire_nature"] }),
  iceSprite: creature("sprite", "ice_casting", { traits: ["ice_nature"] }),
  stormWisp: creature("wisp", "lightning_casting", {
    traits: ["lightning_nature"],
  }),
  ghostWisp: creature("wisp", "lightning_casting", { traits: ["ghost"] }),
  // The warden of the old keep: a boss, spawned only by its quest's room
  // claim — never through the wandering-encounter sampler.
  ogreKeepWarden: creature("ogre", "ready", {
    traits: ["big"],
    armaments: ["club", "shield"],
  }),
} satisfies Record<string, EntityBlobAsset>;

export type EncounterBlobName = keyof typeof ENCOUNTER_BLOBS;

export const ENCOUNTERS = {
  slime1: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["slime"],
  },
  slime2: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["slime", "slime"],
  },
  slime3: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["slime", "slime", "slime"],
  },
  slime4: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["slime", "slime", "slime", "slime"],
  },
  slime2_bat1: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["slime", "slime", "bat"],
  },
  batBig1: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["batBig"],
  },
  rat_pair: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["rat", "rat"],
  },
  rat_swarm: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["rat", "rat", "rat"],
  },
  ogre1: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["ogreWanderer"],
  },
  wolf1: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["wolf"],
  },
  wolf2: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["wolf", "wolf"],
  },
  wolf_pack: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["wolfBig", "wolf", "wolf"],
  },
  wolf1_slime1: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["wolf", "slime"],
  },
  wolf1_bat2: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["wolf", "bat", "batPerched"],
  },
  bandit_pair: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["banditClubber", "banditDuelist"],
  },
  bandit_camp: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["banditWarden", "banditClubber", "banditDuelist"],
  },
  skeleton_watch: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["skeletonGuard", "skeletonGuard"],
  },
  skeleton_pair: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["skeletonGuard", "skeletonDuelist"],
  },
  crypt_risen: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["zombieShambler", "zombieShambler", "skeletonGuard"],
  },
  crypt_stalker: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["vampireStalker", "ghostWisp"],
  },
  fire_imp1: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["fireImp"],
  },
  ice_sprite1: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["iceSprite"],
  },
  storm_wisp1: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["stormWisp"],
  },
  elemental_trio: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["fireImp", "iceSprite", "stormWisp"],
  },
  keep_warden: {
    categoricBlobName: "encounter_enemy",
    blobNames: ["ogreKeepWarden", "banditWarden"],
  },
} satisfies Record<string, EncounterAsset>;

export type EncounterName = keyof typeof ENCOUNTERS;
