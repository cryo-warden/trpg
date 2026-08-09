import { test, expect } from "bun:test";
import {
  LOCATION_MAPS,
  LOCATION_MAP_THEMES,
  getEntityBlobsSampler,
  getLocationMapAuthors,
  getLocationMapThemeAuthors,
} from "./location_maps";

test("getLocationMapThemeAuthors builds selectors for decorations, paths, and rooms", () => {
  const themes = getLocationMapThemeAuthors(LOCATION_MAP_THEMES);
  expect(themes.map((t) => t.name)).toEqual(Object.keys(LOCATION_MAP_THEMES));
  expect(themes[0].decorationsSelector.selections.length).toBe(
    LOCATION_MAP_THEMES.encampment.decorations.length,
  );
});

test("getLocationMapAuthors passes theme and encounter names through", () => {
  const maps = getLocationMapAuthors(LOCATION_MAPS);
  const cave = maps.find((m) => m.name === "beginner_cave");
  expect(cave?.themeName).toBe("cave");
  expect(cave?.encounterNamesSampler.length).toBe(4);
  expect(cave?.connectionNames).toEqual([]);
});

test("getEntityBlobsSampler wraps each selection's blob", () => {
  const sampler = getEntityBlobsSampler([
    { weight: 3, blob: { appearanceFeatureNames: ["rock"] } },
  ]);
  expect(sampler.selections.length).toBe(1);
  expect(sampler.selections[0].weight).toBe(3);
});
