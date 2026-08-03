import { test, expect } from "bun:test";
import { locationMapThemes } from ".";
import {
  LOCATION_MAPS,
  LOCATION_MAP_THEMES,
  getEntityBlobsSampler,
  getLocationMapConnections,
  getLocationMapThemes,
  getLocationMaps,
} from "./location_maps";

test("getLocationMapThemes builds selectors for decorations, paths, and rooms", () => {
  const themes = getLocationMapThemes(LOCATION_MAP_THEMES);
  expect(themes.length).toBe(LOCATION_MAP_THEMES.length);
  expect(themes[0].id).toBe(0);
  expect(themes[0].decorationsSelector.selections.length).toBe(
    LOCATION_MAP_THEMES[0].decorations.length,
  );
});

test("getLocationMaps resolves theme names to ids and builds the encounter sampler", () => {
  const maps = getLocationMaps(LOCATION_MAPS);
  const cave = maps.find((m) => m.name === "beginner_cave");
  expect(cave?.themeId).toBe(
    locationMapThemes.findIndex((t) => t.name === "cave"),
  );
  expect(cave?.encounterIdsSampler.selections.length).toBe(4);
});

test("getEntityBlobsSampler wraps each selection's blob", () => {
  const sampler = getEntityBlobsSampler([
    { weight: 3, blob: { appearanceFeatureNames: ["rock"] } },
  ]);
  expect(sampler.selections.length).toBe(1);
  expect(sampler.selections[0].weight).toBe(3);
});

test("getLocationMapConnections returns no rows when none are configured", () => {
  expect(getLocationMapConnections(LOCATION_MAPS)).toEqual([]);
});
