import { test, expect } from "bun:test";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  DynamicPanelContext,
  useDynamicPanelMode,
  useSetDynamicPanelMode,
} from "./DynamicPanelContext";

test("useDynamicPanelMode defaults to 'location' with no provider", () => {
  expect(renderHook(() => useDynamicPanelMode()).result.current).toBe(
    "location",
  );
});

test("useDynamicPanelMode / useSetDynamicPanelMode read the provider", () => {
  const setMode = () => {};
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DynamicPanelContext.Provider value={{ mode: "stats", setMode }}>
      {children}
    </DynamicPanelContext.Provider>
  );
  expect(renderHook(() => useDynamicPanelMode(), { wrapper }).result.current).toBe(
    "stats",
  );
  expect(
    renderHook(() => useSetDynamicPanelMode(), { wrapper }).result.current,
  ).toBe(setMode);
});
