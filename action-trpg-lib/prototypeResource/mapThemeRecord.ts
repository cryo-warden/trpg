import { createMapTheme, createMapThemeRecord } from "../src/Resource";

export const mapThemeRecord = createMapThemeRecord([
  createMapTheme("debug", [
    "anvil",
    "sprocket",
    "gizmo",
    "dealymabob",
    "thingamajig",
  ]),
  createMapTheme("cave", [
    "stalactite",
    "stalagmite",
    "boulder",
    "stone",
    "pebble",
  ]),
]);
