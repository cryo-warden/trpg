import { test, expect } from "bun:test";
import { classifyRelationship } from "./relationship";

test("same allegiance is friendly", () => {
  expect(
    classifyRelationship({ viewpointAllegianceId: 1n, entityAllegianceId: 1n }),
  ).toBe("friendly");
});

test("different allegiances are hostile", () => {
  expect(
    classifyRelationship({ viewpointAllegianceId: 1n, entityAllegianceId: 2n }),
  ).toBe("hostile");
});

test("an unknown allegiance on either side is neutral", () => {
  expect(
    classifyRelationship({
      viewpointAllegianceId: null,
      entityAllegianceId: 1n,
    }),
  ).toBe("neutral");
  expect(
    classifyRelationship({
      viewpointAllegianceId: 1n,
      entityAllegianceId: null,
    }),
  ).toBe("neutral");
  expect(
    classifyRelationship({
      viewpointAllegianceId: null,
      entityAllegianceId: null,
    }),
  ).toBe("neutral");
});
