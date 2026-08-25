import { test, expect } from "bun:test";
import type { EntityBlobAsset } from "../../stdb/types";
import {
  applyComponentMap,
  blobPairs,
  deepMerge,
  validateBlob,
} from "./assetShort";
import { creature } from "./processing/creature";
import { blob } from "./entity_blobs";

test("deepMerge recurses into plain objects, overriding one inner field", () => {
  const base = { location: { locationEntityId: { tag: "Named", value: "a" }, kind: { tag: "Interior" } } };
  const merged = deepMerge(base, { location: { kind: { tag: "Exterior" } } } as never);
  expect(merged).toEqual({
    location: { locationEntityId: { tag: "Named", value: "a" }, kind: { tag: "Exterior" } },
  });
});

test("deepMerge replaces arrays wholesale — no element-wise merge", () => {
  const base = { traitNames: ["a", "b", "c"] };
  const merged = deepMerge(base, { traitNames: ["x"] } as never);
  expect(merged).toEqual({ traitNames: ["x"] });
});

test("deepMerge leaves a field untouched when the override is undefined", () => {
  const base = { baselineName: "human", stanceName: "standing" };
  expect(deepMerge(base, undefined)).toBe(base);
  expect(deepMerge(base, { stanceName: undefined } as never)).toEqual(base);
});

test("deepMerge adds a component the base did not carry", () => {
  const base: Record<string, unknown> = { baselineName: "human" };
  const merged = deepMerge(base, { enemyController: {} });
  expect(merged).toEqual({ baselineName: "human", enemyController: {} });
});

test("validateBlob passes for an absent component and a complete one", () => {
  expect(() => validateBlob("empty", blob({}))).not.toThrow();
  expect(() =>
    validateBlob(
      "placed",
      blob({
        location: {
          locationEntityId: { tag: "Named", value: "room" },
          kind: { tag: "Interior" },
        },
      }),
    ),
  ).not.toThrow();
});

test("validateBlob throws, naming asset + component + missing field", () => {
  // A half-filled location (escape hatch forgot `kind`).
  const bad = { location: { locationEntityId: { tag: "Named", value: "room" } } } as unknown as EntityBlobAsset;
  expect(() => validateBlob("half_placed", bad)).toThrow(
    /half_placed.*location.*kind/,
  );
});

test("validateBlob throws when a component is present but not an object", () => {
  const bad = { allegiance: "oops" } as unknown as EntityBlobAsset;
  expect(() => validateBlob("bogus", bad)).toThrow(/allegiance.*must be an object/);
});

test("blobPairs turns a record into name+value pairs and validates each", () => {
  const pairs = blobPairs({ a: blob({ baselineName: "human" }), b: blob({}) });
  expect(pairs).toEqual([
    { name: "a", value: blob({ baselineName: "human" }) },
    { name: "b", value: blob({}) },
  ]);
  const broken = {
    ok: blob({}),
    bad: { item: {} } as unknown as EntityBlobAsset, // item missing `tag`
  };
  expect(() => blobPairs(broken)).toThrow(/bad.*item.*tag/);
});

test("applyComponentMap overlays the escape hatch over the built base", () => {
  const withHatch = applyComponentMap(blob({ baselineName: "human" }), {
    allegiance: { allegianceEntityId: { tag: "Literal", value: 100n } },
  });
  // blob() types the expected as the full wire asset (its optional fields are
  // required-with-|undefined, so a bare literal would not match toEqual).
  expect(withHatch).toEqual(
    blob({
      baselineName: "human",
      allegiance: { allegianceEntityId: { tag: "Literal", value: 100n } },
    }),
  );
});

test("creature maps name-typed fields onto the blob's component names", () => {
  expect(
    creature("wolf", "striding", {
      traits: ["big"],
      armaments: ["club"],
      traitPalette: "wolf_variety",
    }),
  ).toEqual(
    blob({
      baselineName: "wolf",
      stanceName: "striding",
      traitNames: ["big"],
      armamentNames: ["club"],
      differentiable: { traitPaletteName: "wolf_variety" },
    }),
  );
});

test("creature omits optional components it was not given", () => {
  expect(creature("slime", "amorphous")).toEqual(
    blob({ baselineName: "slime", stanceName: "amorphous" }),
  );
});

test("creature's escape hatch overrides the built base", () => {
  const boss = creature("ogre", "ready", {
    componentMap: {
      allegiance: { allegianceEntityId: { tag: "Literal", value: 200n } },
    },
  });
  expect(boss.allegiance).toEqual({
    allegianceEntityId: { tag: "Literal", value: 200n },
  });
  expect(boss.baselineName).toBe("ogre");
});
