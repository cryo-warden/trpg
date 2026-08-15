import { test, expect } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import {
  appearanceFeatureIndexOf,
  mockTable,
  stdbWrapper,
} from "../testSupport/mockConnection";
import { useGetName } from "./useGetName";

// Regression: an entity deleted in the same transaction as its final
// event (an eaten cookie) must still render by its LAST-KNOWN look —
// the retained appearance map answers after the live row is gone.
test("a deleted entity still names by its last-known appearance", () => {
  const appearanceRows = mockTable([
    {
      entityId: 7n,
      appearanceFeatureIndexes: [
        appearanceFeatureIndexOf("sparkling"),
        appearanceFeatureIndexOf("red_cookie"),
      ],
    },
  ]);
  const { result } = renderHook(() => useGetName(null), {
    wrapper: stdbWrapper({
      appearance_features_components: appearanceRows,
    }, {} as Identity),
  });
  expect(result.current({ named: 7n })).toContain("red cookie");

  // The eat: the entity's rows vanish. The name survives.
  act(() => {
    appearanceRows.deleteRow((row) => row.entityId === 7n);
  });
  expect(result.current({ named: 7n })).toContain("red cookie");
});
