import { test, expect } from "bun:test";
import { renderHook } from "@testing-library/react";
import { mockTable, stdbWrapper } from "../testSupport/mockConnection";
import { useGetClassName } from "./useGetClassName";

test("useGetClassName classifies entities by allegiance relative to the viewpoint", () => {
  const wrapper = stdbWrapper({
    allegiance_components: mockTable([
      { entityId: 1n, allegianceEntityId: 10n },
      { entityId: 2n, allegianceEntityId: 10n },
      { entityId: 3n, allegianceEntityId: 20n },
    ]),
  });
  const getClassName = renderHook(() => useGetClassName(1n), { wrapper }).result
    .current;

  expect(getClassName(2n)).toBe("friendly"); // shares the viewpoint's allegiance
  expect(getClassName(3n)).toBe("hostile"); // different allegiance
  expect(getClassName(99n)).toBe("neutral"); // unknown allegiance
  expect(getClassName("a literal")).toBe(""); // literals carry no class
  expect(getClassName(undefined)).toBe("");
});
