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
  slime: creature({ baseline: "slime", stance: "amorphous" }),
  slimeSmall: creature({
    baseline: "slime",
    stance: "amorphous",
    traits: ["small"],
  }),
  slimeBig: creature({ baseline: "slime", stance: "amorphous", traits: ["big"] }),
  bat: creature({ baseline: "bat", stance: "flapping" }),
  batBig: creature({ baseline: "bat", stance: "flapping", traits: ["big"] }),
  batPerched: creature({ baseline: "bat", stance: "perched" }),
  ogreWanderer: creature({
    baseline: "ogre",
    armaments: ["club"],
    stance: "striding",
  }),
  rat: creature({ baseline: "rat", stance: "standing" }),
  // Wolves draw distinct variety traits per pack (brawny/rangy/scrawny/
  // scarred), so a pack reads as individuals instead of "wolf 1-4".
  wolf: creature({ baseline: "wolf", stance: "striding", variety: "wolf_variety" }),
  wolfBig: creature({
    baseline: "wolf",
    stance: "striding",
    traits: ["big"],
    variety: "wolf_variety",
  }),
  // Bandits and skeletons fight with what they carry: the armament grants
  // the attack, the stance shapes the fight.
  banditClubber: creature({
    baseline: "bandit",
    armaments: ["club"],
    stance: "standing",
  }),
  banditDuelist: creature({
    baseline: "bandit",
    armaments: ["dagger"],
    stance: "dueling",
  }),
  banditWarden: creature({
    baseline: "bandit",
    armaments: ["club", "shield"],
    stance: "ready",
  }),
  // Natures ride bodies: a skeleton is a human body with the skeletal
  // nature, and any element can ride any body. The natures are
  // appearance-only until the damage attribute system lands.
  skeletonGuard: creature({
    baseline: "human",
    traits: ["skeletal"],
    armaments: ["spear"],
    stance: "ready",
  }),
  skeletonDuelist: creature({
    baseline: "human",
    traits: ["skeletal"],
    armaments: ["sword"],
    stance: "dueling",
  }),
  zombieShambler: creature({
    baseline: "human",
    traits: ["zombie"],
    armaments: ["club"],
    stance: "standing",
  }),
  vampireStalker: creature({
    baseline: "human",
    traits: ["vampire"],
    armaments: ["dagger"],
    stance: "dueling",
  }),
  fireImp: creature({
    baseline: "imp",
    traits: ["fire_nature"],
    stance: "fire_casting",
  }),
  iceSprite: creature({
    baseline: "sprite",
    traits: ["ice_nature"],
    stance: "ice_casting",
  }),
  stormWisp: creature({
    baseline: "wisp",
    traits: ["lightning_nature"],
    stance: "lightning_casting",
  }),
  ghostWisp: creature({
    baseline: "wisp",
    traits: ["ghost"],
    stance: "lightning_casting",
  }),
  // The warden of the old keep: a boss, spawned only by its quest's room
  // claim — never through the wandering-encounter sampler.
  ogreKeepWarden: creature({
    baseline: "ogre",
    traits: ["big"],
    armaments: ["club", "shield"],
    stance: "ready",
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
