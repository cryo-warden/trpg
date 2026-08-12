import { test, expect } from "bun:test";
import { getEntityBlobAuthor, NEW_PLAYER_BLOB } from "./entity_blobs";

test("getEntityBlobAuthor passes asset names through for server-side resolution", () => {
  const blob = getEntityBlobAuthor({
    ...NEW_PLAYER_BLOB,
    traits: [...NEW_PLAYER_BLOB.traits],
    pinnedActionNames: [...NEW_PLAYER_BLOB.pinnedActionNames],
  });

  expect(blob.baselineName).toBe("human");
  expect(blob.traitNames).toEqual([...NEW_PLAYER_BLOB.traits]);
  expect(blob.pinnedActionNames).toEqual([
    "boppity_bop",
    "quick_move",
    "divine_heal",
  ]);
  expect(blob.allegiance?.allegianceEntityId).toEqual({
    tag: "Named",
    value: "allegiance1",
  });
});

test("getEntityBlobAuthor builds a name component and omits absent fields", () => {
  const blob = getEntityBlobAuthor({
    name: "thing",
    appearanceFeatureNames: ["rock"],
  });

  expect(blob.name?.name).toBe("thing");
  expect(blob.appearanceFeatureNames).toEqual(["rock"]);
  expect(blob.baselineName).toBeUndefined();
  expect(blob.pinnedActionNames).toBeUndefined();
});
