import { test, expect, jest } from "bun:test";
import { renderHook } from "@testing-library/react";
import { usePeriodicEffect } from "./usePeriodicEffect";

test("usePeriodicEffect runs immediately, repeats each period, and stops on unmount", () => {
  jest.useFakeTimers();
  try {
    let runs = 0;
    const { unmount } = renderHook(() =>
      usePeriodicEffect(
        () => () => {
          runs += 1;
        },
        1000,
        [],
      ),
    );

    expect(runs).toBe(1); // ran once immediately
    jest.advanceTimersByTime(3000);
    expect(runs).toBe(4); // + one per 1000ms
    unmount();
    jest.advanceTimersByTime(5000);
    expect(runs).toBe(4); // cancelled: no further runs
  } finally {
    jest.useRealTimers();
  }
});
