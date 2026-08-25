import { EncounterAsset, EntityBlobAsset } from "../../stdb/types";
import { blob } from "./entity_blobs";

/* TODO Add enemy allegiance component */
// The categoric blob merged into every encounter member: the enemy
// controller marks it a threat. Its HP/EP/etc. derive from its baseline like
// any body's — no opt-in flag. Not a creature (no body of its own); it stays
// a bare fragment.
// ABSOLUTELY immobile: the player alone moves between rooms; every
// controlled enemy holds its ground. The flag cancels any Move effect and
// keeps the enemy AI from ever selecting a movement action. Riding the
// categoric blob stamps it on every encounter member in one place. It is one
// named entry in the single unified entity-blob table (see bundle/entityBlobs).
export const ENCOUNTER_ENEMY_BLOB: EntityBlobAsset = blob({
  enemyController: {},
  immobile: {},
});

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
