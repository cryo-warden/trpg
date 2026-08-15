import { EncounterAsset, EntityBlobAsset } from "../../stdb/types";
import { blob } from "./entity_blobs";

export const ENCOUNTER_BLOBS = {
  /* TODO Add enemy allegiance component */
  // The categoric blob merged into every encounter member: enemies opt in to
  // a mechanical stat block here, once, so every creature gets its HP/EP/etc.
  encounter_enemy: blob({ enemyController: {}, appliesStatBlock: {} }),
  slime: blob({ baselineName: "slime", stanceName: "amorphous" }),
  slimeSmall: blob({
    baselineName: "slime",
    stanceName: "amorphous",
    traitNames: ["small"],
  }),
  slimeBig: blob({
    baselineName: "slime",
    stanceName: "amorphous",
    traitNames: ["big"],
  }),
  bat: blob({ baselineName: "bat", stanceName: "flapping" }),
  batBig: blob({
    baselineName: "bat",
    stanceName: "flapping",
    traitNames: ["big"],
  }),
  batPerched: blob({ baselineName: "bat", stanceName: "perched" }),
  ogreWanderer: blob({
    baselineName: "ogre",
    armamentNames: ["club"],
    stanceName: "striding",
  }),
  rat: blob({ baselineName: "rat", stanceName: "standing" }),
  wolf: blob({ baselineName: "wolf", stanceName: "striding" }),
  wolfBig: blob({
    baselineName: "wolf",
    stanceName: "striding",
    traitNames: ["big"],
  }),
  // Bandits and skeletons fight with what they carry: the armament grants
  // the attack, the stance shapes the fight.
  banditClubber: blob({
    baselineName: "bandit",
    armamentNames: ["club"],
    stanceName: "standing",
  }),
  banditDuelist: blob({
    baselineName: "bandit",
    armamentNames: ["dagger"],
    stanceName: "dueling",
  }),
  banditWarden: blob({
    baselineName: "bandit",
    armamentNames: ["club", "shield"],
    stanceName: "ready",
  }),
  // Natures ride bodies: a skeleton is a human body with the skeletal
  // nature, and any element can ride any body. The natures are
  // appearance-only until the damage attribute system lands.
  skeletonGuard: blob({
    baselineName: "human",
    traitNames: ["skeletal"],
    armamentNames: ["spear"],
    stanceName: "ready",
  }),
  skeletonDuelist: blob({
    baselineName: "human",
    traitNames: ["skeletal"],
    armamentNames: ["sword"],
    stanceName: "dueling",
  }),
  zombieShambler: blob({
    baselineName: "human",
    traitNames: ["zombie"],
    armamentNames: ["club"],
    stanceName: "standing",
  }),
  vampireStalker: blob({
    baselineName: "human",
    traitNames: ["vampire"],
    armamentNames: ["dagger"],
    stanceName: "dueling",
  }),
  fireImp: blob({
    baselineName: "imp",
    traitNames: ["fire_nature"],
    stanceName: "fire_casting",
  }),
  iceSprite: blob({
    baselineName: "sprite",
    traitNames: ["ice_nature"],
    stanceName: "ice_casting",
  }),
  stormWisp: blob({
    baselineName: "wisp",
    traitNames: ["lightning_nature"],
    stanceName: "lightning_casting",
  }),
  ghostWisp: blob({
    baselineName: "wisp",
    traitNames: ["ghost"],
    stanceName: "lightning_casting",
  }),
  // The warden of the old keep: a boss, spawned only by its quest's room
  // claim — never through the wandering-encounter sampler.
  ogreKeepWarden: blob({
    baselineName: "ogre",
    traitNames: ["big"],
    armamentNames: ["club", "shield"],
    stanceName: "ready",
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
