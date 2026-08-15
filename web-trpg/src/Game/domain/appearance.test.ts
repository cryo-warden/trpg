import { test, expect } from "bun:test";
import {
  APPEARANCE_FEATURES,
  AppearanceFeatureName,
} from "../assets/appearance_features";
import { describeAppearance, getName } from "./appearance";

const noAppearance = () => null;

/** Resolve feature names to their assets, as the runtime resolver does — each
 * carries its own exclusionGroup. */
const featuresOf = (...names: AppearanceFeatureName[]) =>
  names.map((name) => APPEARANCE_FEATURES[name]);

test("returns null for an absent name", () => {
  expect(
    getName({
      named: undefined,
      viewpoint: null,
      appearanceFeaturesOf: noAppearance,
    }),
  ).toBeNull();
});

test("passes literal string names through unchanged", () => {
  expect(
    getName({
      named: "the oak door",
      viewpoint: null,
      appearanceFeaturesOf: noAppearance,
    }),
  ).toBe("the oak door");
});

test("names the viewpoint entity 'you', or 'yourself' when it is also the subject", () => {
  expect(
    getName({
      named: 1n,
      viewpoint: 1n,
      appearanceFeaturesOf: noAppearance,
    }),
  ).toBe("you");
  expect(
    getName({
      named: 1n,
      subject: 1n,
      viewpoint: 1n,
      appearanceFeaturesOf: noAppearance,
    }),
  ).toBe("yourself");
});

test("falls back to 'something' when appearance is unknown or empty", () => {
  expect(
    getName({ named: 2n, viewpoint: 1n, appearanceFeaturesOf: () => null }),
  ).toBe("something");
  expect(
    getName({ named: 2n, viewpoint: 1n, appearanceFeaturesOf: () => [] }),
  ).toBe("something");
});

// describeAppearance turns resolved features into "adjective, adjective noun".
test("describeAppearance names a bare noun", () => {
  expect(describeAppearance([APPEARANCE_FEATURES.human])).toBe("human");
});

test("describeAppearance prefixes adjectives, highest priority last", () => {
  expect(
    describeAppearance([
      APPEARANCE_FEATURES.human,
      APPEARANCE_FEATURES.tiny, // priority 1000
      APPEARANCE_FEATURES.small, // priority 900
    ]),
  ).toBe("small, tiny human");
});

test("describeAppearance falls back to 'something' for null or no features", () => {
  expect(describeAppearance(null)).toBe("something");
  expect(describeAppearance([])).toBe("something");
});

// An identity trait contributes BOTH a noun and an adjective; only one is
// selected per entity — the noun replaces the low-priority "human" body, but
// yields to a real creature body and rides along as its adjective.
test("an identity noun replaces the human body noun", () => {
  expect(describeAppearance(featuresOf("human", "skeleton", "skeletal"))).toBe(
    "skeleton",
  );
  expect(describeAppearance(featuresOf("human", "zombie", "zombieLike"))).toBe(
    "zombie",
  );
});

test("an identity rides a real body as its adjective, not a second noun", () => {
  expect(describeAppearance(featuresOf("wolf", "skeleton", "skeletal"))).toBe(
    "skeletal wolf",
  );
  expect(describeAppearance(featuresOf("bat", "zombie", "zombieLike"))).toBe(
    "zombie bat",
  );
});

test("a losing identity contributes at most one adjective, never doubled", () => {
  // Both the zombie noun and zombie adjective are present; the bat noun wins,
  // and the zombie group yields exactly one adjective — never "zombie zombie".
  expect(describeAppearance(featuresOf("bat", "zombie", "zombieLike"))).toBe(
    "zombie bat",
  );
});
