import { test, expect } from "bun:test";
import { renderHook } from "@testing-library/react";
import { mockTable, stdbWrapper } from "../../testSupport/mockConnection";
import { useSetActionHotkey } from "./useSetActionHotkey";

test("useSetActionHotkey exposes pointer handlers without throwing", () => {
  const { result } = renderHook(() => useSetActionHotkey(0), {
    wrapper: stdbWrapper({ player_controller_components: mockTable([]) }),
  });

  expect(typeof result.current.onPointerOver).toBe("function");
  expect(typeof result.current.onPointerOut).toBe("function");
  result.current.onPointerOver();
  result.current.onPointerOut();
});
