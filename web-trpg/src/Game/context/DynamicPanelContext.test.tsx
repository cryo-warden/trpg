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
    <DynamicPanelContext.Provider value={{ mode: "stances", setMode }}>
      {children}
    </DynamicPanelContext.Provider>
  );
  expect(renderHook(() => useDynamicPanelMode(), { wrapper }).result.current).toBe(
    "stances",
  );
  expect(
    renderHook(() => useSetDynamicPanelMode(), { wrapper }).result.current,
  ).toBe(setMode);
});

test("useSetDynamicPanelMode returns a no-op default outside a provider", () => {
  const setMode = renderHook(() => useSetDynamicPanelMode()).result.current;
  expect(() => setMode("stances")).not.toThrow();
});
