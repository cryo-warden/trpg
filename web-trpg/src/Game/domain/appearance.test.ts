import { test, expect } from "bun:test";
import { describeAppearance, getName } from "./appearance";

const noAppearance = () => null;

test("returns null for an absent name", () => {
  expect(
    getName({
      named: undefined,
      viewpoint: null,
      appearanceFeatureIndexesOf: noAppearance,
    }),
  ).toBeNull();
});

test("passes literal string names through unchanged", () => {
  expect(
    getName({
      named: "the oak door",
      viewpoint: null,
      appearanceFeatureIndexesOf: noAppearance,
    }),
  ).toBe("the oak door");
});

test("names the viewpoint entity 'you', or 'yourself' when it is also the subject", () => {
  expect(
    getName({
      named: 1n,
      viewpoint: 1n,
      appearanceFeatureIndexesOf: noAppearance,
    }),
  ).toBe("you");
  expect(
    getName({
      named: 1n,
      subject: 1n,
      viewpoint: 1n,
      appearanceFeatureIndexesOf: noAppearance,
    }),
  ).toBe("yourself");
});

test("falls back to 'something' when appearance is unknown or empty", () => {
  expect(
    getName({ named: 2n, viewpoint: 1n, appearanceFeatureIndexesOf: () => null }),
  ).toBe("something");
  expect(
    getName({ named: 2n, viewpoint: 1n, appearanceFeatureIndexesOf: () => [] }),
  ).toBe("something");
});

// describeAppearance resolves feature indexes into "adjective, adjective noun".
// In the appearance asset, index 0 is the noun "human"; indexes 19 and 20 are
// the adjectives "tiny" (priority 1000) and "small" (900).
test("describeAppearance names a bare noun", () => {
  expect(describeAppearance([0])).toBe("human");
});

test("describeAppearance prefixes adjectives, highest priority last", () => {
  expect(describeAppearance([0, 19, 20])).toBe("small, tiny human");
});

test("describeAppearance falls back to 'something' for null or unknown features", () => {
  expect(describeAppearance(null)).toBe("something");
  expect(describeAppearance([9999])).toBe("something");
});
