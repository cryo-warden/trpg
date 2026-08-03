import { test, expect } from "bun:test";
import { getName } from "./appearance";

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
