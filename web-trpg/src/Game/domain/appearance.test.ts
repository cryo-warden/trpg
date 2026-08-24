import { test, expect } from "bun:test";
import {
  APPEARANCE_FEATURES,
  AppearanceFeatureName,
} from "../assets/appearance_features";
import { appearanceFeatureDisplayOf } from "../../renderer/en-us/appearanceFeatures";
import { describeAppearance, getName, NamingFeature } from "./appearance";

const noAppearance = () => null;

// Render role keys with the real en-US locale, so these tests exercise the
// same asset -> key -> display path the app uses.
const displayOf = (name: string) =>
  appearanceFeatureDisplayOf(name as AppearanceFeatureName);

/** Resolve feature names to their assets as the runtime resolver does — each
 * carries its ROLE KEY (`name`) plus its own exclusionGroup. */
const featuresOf = (...names: AppearanceFeatureName[]): NamingFeature[] =>
  names.map((name) => ({ name, ...APPEARANCE_FEATURES[name] }));

const describe = (...names: AppearanceFeatureName[]) =>
  describeAppearance({ features: featuresOf(...names), displayOf });

test("returns null for an absent name", () => {
  expect(
    getName({
      named: undefined,
      viewpoint: null,
      appearanceFeaturesOf: noAppearance,
      displayOf,
    }),
  ).toBeNull();
});

test("passes literal string names through unchanged", () => {
  expect(
    getName({
      named: "the oak door",
      viewpoint: null,
      appearanceFeaturesOf: noAppearance,
      displayOf,
    }),
  ).toBe("the oak door");
});

test("names the viewpoint entity 'you', or 'yourself' when it is also the subject", () => {
  expect(
    getName({
      named: 1n,
      viewpoint: 1n,
      appearanceFeaturesOf: noAppearance,
      displayOf,
    }),
  ).toBe("you");
  expect(
    getName({
      named: 1n,
      subject: 1n,
      viewpoint: 1n,
      appearanceFeaturesOf: noAppearance,
      displayOf,
    }),
  ).toBe("yourself");
});

test("falls back to 'something' when appearance is unknown or empty", () => {
  expect(
    getName({
      named: 2n,
      viewpoint: 1n,
      appearanceFeaturesOf: () => null,
      displayOf,
    }),
  ).toBe("something");
  expect(
    getName({
      named: 2n,
      viewpoint: 1n,
      appearanceFeaturesOf: () => [],
      displayOf,
    }),
  ).toBe("something");
});

// describeAppearance turns resolved features into "adjective, adjective noun".
test("describeAppearance names a bare noun", () => {
  expect(describe("human")).toBe("human");
});

test("describeAppearance prefixes adjectives, highest priority last", () => {
  expect(
    describe(
      "human",
      "tiny", // priority 1000
      "small", // priority 900
    ),
  ).toBe("small, tiny human");
});

test("describeAppearance falls back to 'something' for null or no features", () => {
  expect(describeAppearance({ features: null, displayOf })).toBe("something");
  expect(describeAppearance({ features: [], displayOf })).toBe("something");
});

// An identity trait contributes BOTH a noun and an adjective; only one is
// selected per entity — the noun replaces the low-priority "human" body, but
// yields to a real creature body and rides along as its adjective.
test("an identity noun replaces the human body noun", () => {
  expect(describe("human", "skeleton", "skeletal")).toBe("skeleton");
  expect(describe("human", "zombie", "zombieLike")).toBe("zombie");
});

test("an identity rides a real body as its adjective, not a second noun", () => {
  expect(describe("wolf", "skeleton", "skeletal")).toBe("skeletal wolf");
  expect(describe("bat", "zombie", "zombieLike")).toBe("zombie bat");
});

test("a losing identity contributes at most one adjective, never doubled", () => {
  // Both the zombie noun and zombie adjective are present; the bat noun wins,
  // and the zombie group yields exactly one adjective — never "zombie zombie".
  expect(describe("bat", "zombie", "zombieLike")).toBe("zombie bat");
});
