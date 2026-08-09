import { test, expect } from "bun:test";
import {
  LOCATION_MAPS,
  LOCATION_MAP_THEMES,
  getEntityBlobsSampler,
  toLocationMapAuthor,
  toLocationMapThemeAuthor,
} from "./location_maps";

test("toLocationMapThemeAuthor builds selectors for decorations, paths, and rooms", () => {
  const theme = toLocationMapThemeAuthor(LOCATION_MAP_THEMES.encampment);
  expect(theme.decorationsSelector.selections.length).toBe(
    LOCATION_MAP_THEMES.encampment.decorations.length,
  );
});

test("toLocationMapAuthor passes theme and encounter names through", () => {
  const cave = toLocationMapAuthor(LOCATION_MAPS.beginner_cave);
  expect(cave.themeName).toBe("cave");
  expect(cave.encounterNamesSampler.length).toBe(4);
  expect(cave.connectionNames).toEqual([]);
});

test("getEntityBlobsSampler wraps each selection's blob", () => {
  const sampler = getEntityBlobsSampler([
    { weight: 3, blob: { appearanceFeatureNames: ["rock"] } },
  ]);
  expect(sampler.selections.length).toBe(1);
  expect(sampler.selections[0].weight).toBe(3);
});
