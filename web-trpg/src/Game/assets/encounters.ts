import {
  Encounter,
  EncounterBlob,
  EncounterIdSample,
  EncounterIdsSampler,
} from "../../stdb/types";
import { Simplify } from "../../structural/Simplify";
import { EntityBlobAsset, getEntityBlob } from "./entity_blobs";

export type EncounterBlobAsset = Simplify<
  { name: string; blob: EntityBlobAsset } & Omit<EncounterBlob, "id" | "blob">
>;

export const CATEGORICAL_BLOBS = [
  {
    name: "encounter_enemy",
    /* TODO Add enemy allegiance component */
    blob: {
      enemyController: { entityId: 0n },
    },
  },
] as const satisfies EncounterBlobAsset[];

export const ENEMY_ENCOUNTER_BLOBS = [
  { name: "slime", blob: { baseline: "slime" } },
  { name: "slimeSmall", blob: { baseline: "slime", traits: ["small"] } },
  { name: "slimeBig", blob: { baseline: "slime", traits: ["big"] } },
  { name: "bat", blob: { baseline: "bat" } },
  { name: "batBig", blob: { baseline: "bat", traits: ["big"] } },
] as const satisfies EncounterBlobAsset[];

export const ENCOUNTER_BLOBS = [
  ...CATEGORICAL_BLOBS,
  ...ENEMY_ENCOUNTER_BLOBS,
] as const satisfies readonly EncounterBlobAsset[];

export const getEncounterBlobs = (): EncounterBlob[] =>
  ENCOUNTER_BLOBS.map((asset, id) => ({
    id,
    blob: getEntityBlob(asset.blob),
  }));

export type EncounterAsset = Simplify<
  {
    name: string;
    categoricBlobName: (typeof CATEGORICAL_BLOBS)[number]["name"];
    blobNames: (typeof ENCOUNTER_BLOBS)[number]["name"][];
  } & Omit<Encounter, "id" | "categoricBlobId" | "blobIds">
>;

export const ENCOUNTERS = [
  {
    name: "slime1",
    categoricBlobName: "encounter_enemy",
    blobNames: ["slime"],
  },
  {
    name: "slime2",
    categoricBlobName: "encounter_enemy",
    blobNames: ["slime", "slime"],
  },
  {
    name: "slime3",
    categoricBlobName: "encounter_enemy",
    blobNames: ["slime", "slime", "slime"],
  },
  {
    name: "slime4",
    categoricBlobName: "encounter_enemy",
    blobNames: ["slime", "slime", "slime", "slime"],
  },
  {
    name: "slime2_bat1",
    categoricBlobName: "encounter_enemy",
    blobNames: ["slime", "slime", "bat"],
  },
  {
    name: "batBig1",
    categoricBlobName: "encounter_enemy",
    blobNames: ["batBig"],
  },
] as const satisfies readonly EncounterAsset[];

export const getEncounters = (): Encounter[] =>
  ENCOUNTERS.map((asset, id) => ({
    id,
    categoricBlobId: ENCOUNTER_BLOBS.findIndex(
      (b) => b.name === asset.categoricBlobName,
    ),
    blobIds: asset.blobNames.map((name) =>
      ENCOUNTER_BLOBS.findIndex((b) => b.name === name),
    ),
  }));

export type EncountersSamplerAsset = Simplify<
  {
    name: (typeof ENCOUNTERS)[number]["name"];
  } & Omit<EncounterIdSample, "id">
>[];

export const getEncounterIdsSampler = (
  asset: EncountersSamplerAsset,
): EncounterIdsSampler => ({
  selections: asset.map((s) => ({
    id: ENCOUNTERS.findIndex((e) => e.name === s.name),
    weight: s.weight,
  })),
});
