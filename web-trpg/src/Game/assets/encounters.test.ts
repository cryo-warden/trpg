import { test, expect } from "bun:test";
import {
  ENCOUNTERS,
  ENCOUNTER_BLOBS,
  getEncounterBlobs,
  getEncounters,
  getEncounterIdsSampler,
} from "./encounters";

test("getEncounters resolves categoric and blob names to ids", () => {
  const encounters = getEncounters();
  expect(encounters.length).toBe(ENCOUNTERS.length);
  const slime1 = encounters[0];
  expect(slime1.categoricBlobId).toBe(
    ENCOUNTER_BLOBS.findIndex((b) => b.name === "encounter_enemy"),
  );
  expect(slime1.blobIds).toEqual([
    ENCOUNTER_BLOBS.findIndex((b) => b.name === "slime"),
  ]);
});

test("getEncounterBlobs builds an EntityBlob per blob with a sequential id", () => {
  const blobs = getEncounterBlobs();
  expect(blobs.map((b) => b.id)).toEqual(ENCOUNTER_BLOBS.map((_, i) => i));
});

test("getEncounterIdsSampler resolves encounter names to weighted ids", () => {
  const sampler = getEncounterIdsSampler([{ name: "slime1", weight: 2 }]);
  expect(sampler.selections).toEqual([
    { id: ENCOUNTERS.findIndex((e) => e.name === "slime1"), weight: 2 },
  ]);
});
