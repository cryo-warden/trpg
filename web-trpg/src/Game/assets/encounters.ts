import { EncounterAuthor, EntityBlobAuthor } from "../../stdb/types";
import { EntityBlobAsset, getEntityBlobAuthor } from "./entity_blobs";

export type EncounterBlobAsset = { blob: EntityBlobAsset };

export const ENCOUNTER_BLOBS = {
  /* TODO Add enemy allegiance component */
  encounter_enemy: { blob: { enemyController: {} } },
  slime: { blob: { baseline: "slime" } },
  slimeSmall: { blob: { baseline: "slime", traits: ["small"] } },
  slimeBig: { blob: { baseline: "slime", traits: ["big"] } },
  bat: { blob: { baseline: "bat" } },
  batBig: { blob: { baseline: "bat", traits: ["big"] } },
} as const satisfies Record<string, EncounterBlobAsset>;

export type EncounterBlobName = keyof typeof ENCOUNTER_BLOBS;

export type EncounterAsset = {
  categoricBlobName: EncounterBlobName;
  blobNames: EncounterBlobName[];
};

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
} as const satisfies Record<string, EncounterAsset>;

export type EncounterName = keyof typeof ENCOUNTERS;

export const toEncounterBlobAuthor = (
  asset: EncounterBlobAsset,
): EntityBlobAuthor => getEntityBlobAuthor(asset.blob);

export type EncountersSamplerAsset = {
  weight: number;
  name: EncounterName;
}[];

export const toEncounterAuthor = (asset: EncounterAsset): EncounterAuthor => ({
  categoricBlobName: asset.categoricBlobName,
  blobNames: [...asset.blobNames],
});
