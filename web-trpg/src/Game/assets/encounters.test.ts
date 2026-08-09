import { test, expect } from "bun:test";
import { namedPairs } from ".";
import {
  ENCOUNTERS,
  ENCOUNTER_BLOBS,
  toEncounterAuthor,
  toEncounterBlobAuthor,
} from "./encounters";

test("encounter authors pass names through for server-side resolution", () => {
  const pairs = namedPairs(ENCOUNTERS, toEncounterAuthor);
  expect(pairs.map((p) => p.name)).toEqual(Object.keys(ENCOUNTERS));
  const slime1 = pairs.find((p) => p.name === "slime1");
  expect(slime1?.value.categoricBlobName).toBe("encounter_enemy");
  expect(slime1?.value.blobNames).toEqual(["slime"]);
});

test("encounter blob authors keep asset names in the blob body", () => {
  const pairs = namedPairs(ENCOUNTER_BLOBS, toEncounterBlobAuthor);
  expect(pairs.map((p) => p.name)).toEqual(Object.keys(ENCOUNTER_BLOBS));
  const slime = pairs.find((p) => p.name === "slime");
  expect(slime?.value.baselineName).toBe("slime");
});
