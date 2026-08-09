import { test, expect } from "bun:test";
import {
  APPEARANCE_FEATURES,
  AppearanceFeatureName,
} from "../assets/appearance_features";
import { describeAppearance, getName } from "./appearance";

const featureIndex = (name: AppearanceFeatureName) =>
  Object.keys(APPEARANCE_FEATURES).indexOf(name);

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
test("describeAppearance names a bare noun", () => {
  expect(describeAppearance([featureIndex("human")])).toBe("human");
});

test("describeAppearance prefixes adjectives, highest priority last", () => {
  expect(
    describeAppearance([
      featureIndex("human"),
      featureIndex("tiny"), // priority 1000
      featureIndex("small"), // priority 900
    ]),
  ).toBe("small, tiny human");
});

test("describeAppearance falls back to 'something' for null or unknown features", () => {
  expect(describeAppearance(null)).toBe("something");
  expect(describeAppearance([9999])).toBe("something");
});
