import { test, expect } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useHotkey } from "./useHotkey";

test("useHotkey fires the handler on its key, ignores others, and cleans up", () => {
  let fired = 0;
  const { unmount } = renderHook(() =>
    useHotkey("a", () => {
      fired += 1;
    }),
  );

  document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
  expect(fired).toBe(1);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
  expect(fired).toBe(1);

  unmount();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
  expect(fired).toBe(1);
});

test("useHotkey does nothing without a hotkey", () => {
  renderHook(() =>
    useHotkey(undefined, () => {
      throw new Error("handler should not fire");
    }),
  );
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
});
