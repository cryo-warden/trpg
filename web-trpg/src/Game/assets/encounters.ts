import { EncounterAsset, EntityBlobAsset } from "../../stdb/types";
import { blob } from "./entity_blobs";

export const ENCOUNTER_BLOBS = {
  /* TODO Add enemy allegiance component */
  encounter_enemy: blob({ enemyController: {} }),
  slime: blob({ baselineName: "slime" }),
  slimeSmall: blob({ baselineName: "slime", traitNames: ["small"] }),
  slimeBig: blob({ baselineName: "slime", traitNames: ["big"] }),
  bat: blob({ baselineName: "bat" }),
  batBig: blob({ baselineName: "bat", traitNames: ["big"] }),
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
} satisfies Record<string, EncounterAsset>;

export type EncounterName = keyof typeof ENCOUNTERS;
