import { test, expect } from "bun:test";
import { APPEARANCE_FEATURES } from "../assets/appearance_features";
import { describeAppearance, getName } from "./appearance";

const noAppearance = () => null;

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
