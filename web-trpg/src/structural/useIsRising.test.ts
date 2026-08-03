import { test, expect } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useIsRising } from "./useIsRising";

test("useIsRising reports rising, falling, and holds steady on no change", () => {
  const { result, rerender } = renderHook(({ v }) => useIsRising(0, v), {
    initialProps: { v: 0 },
  });

  expect(result.current).toBe(true); // steady at the start -> defaults to rising
  rerender({ v: 5 });
  expect(result.current).toBe(true); // rose
  rerender({ v: 2 });
  expect(result.current).toBe(false); // fell
  rerender({ v: 2 });
  expect(result.current).toBe(false); // unchanged -> keeps the last direction
  rerender({ v: 8 });
  expect(result.current).toBe(true); // rose again
});
