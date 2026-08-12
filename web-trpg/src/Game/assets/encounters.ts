import { EncounterAsset, EntityBlobAsset } from "../../stdb/types";
import { blob } from "./entity_blobs";

export const ENCOUNTER_BLOBS = {
  /* TODO Add enemy allegiance component */
  encounter_enemy: blob({ enemyController: {} }),
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
  skeletonGuard: blob({
    baselineName: "skeleton",
    armamentNames: ["spear"],
    stanceName: "ready",
  }),
  skeletonDuelist: blob({
    baselineName: "skeleton",
    armamentNames: ["sword"],
    stanceName: "dueling",
  }),
  fireImp: blob({ baselineName: "imp", stanceName: "fire_casting" }),
  iceSprite: blob({ baselineName: "sprite", stanceName: "ice_casting" }),
  stormWisp: blob({ baselineName: "wisp", stanceName: "lightning_casting" }),
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
} satisfies Record<string, EncounterAsset>;

export type EncounterName = keyof typeof ENCOUNTERS;
