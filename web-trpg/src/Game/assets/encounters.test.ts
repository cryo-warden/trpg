import { test, expect } from "bun:test";
import {
  ENCOUNTERS,
  ENCOUNTER_BLOBS,
  getEncounterAuthors,
  getEncounterBlobAuthors,
} from "./encounters";

test("getEncounterAuthors passes names through for server-side resolution", () => {
  const authors = getEncounterAuthors();
  expect(authors.length).toBe(Object.keys(ENCOUNTERS).length);
  const slime1 = authors.find((a) => a.name === "slime1");
  expect(slime1?.categoricBlobName).toBe("encounter_enemy");
  expect(slime1?.blobNames).toEqual(["slime"]);
});

test("getEncounterBlobAuthors builds a named blob author per blob asset", () => {
  const authors = getEncounterBlobAuthors();
  expect(authors.map((a) => a.name)).toEqual(Object.keys(ENCOUNTER_BLOBS));
  const slime = authors.find((a) => a.name === "slime");
  expect(slime?.blob.baselineName).toBe("slime");
});
