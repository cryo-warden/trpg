import { test, expect } from "bun:test";
import { actions, appearanceFeatures, baselines } from ".";
import { getEntityBlob, NEW_PLAYER_BLOB } from "./entity_blobs";

test("getEntityBlob resolves baseline, traits, and action hotkeys by name", () => {
  const blob = getEntityBlob({
    ...NEW_PLAYER_BLOB,
    traits: [...NEW_PLAYER_BLOB.traits],
    actionHotkeys: [...NEW_PLAYER_BLOB.actionHotkeys],
  });

  expect(blob.baseline?.baselineId).toBe(
    baselines.findIndex((b) => b.name === "human"),
  );
  expect(blob.traits?.traitIds.length).toBe(NEW_PLAYER_BLOB.traits.length);
  const hotkeys = blob.actionHotkeys?.actionHotkeys ?? [];
  expect(hotkeys[0].actionId).toBe(
    actions.findIndex((a) => a.name === "boppity_bop"),
  );
  expect(hotkeys[0].characterCode).toBe("v".charCodeAt(0));
});

test("getEntityBlob resolves a name and appearance features, omitting absent fields", () => {
  const blob = getEntityBlob({ name: "thing", appearanceFeatureNames: ["rock"] });

  expect(blob.name?.name).toBe("thing");
  expect(blob.appearanceFeatures?.appearanceFeatureIndexes).toEqual([
    appearanceFeatures.findIndex((f) => f.name === "rock"),
  ]);
  expect(blob.baseline).toBeUndefined();
  expect(blob.actionHotkeys).toBeUndefined();
});
