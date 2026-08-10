import { test, expect } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Identity } from "spacetimedb";
import { mockTable, stdbWrapper } from "../../testSupport/mockConnection";
import {
  TargetContext,
  useSetTarget,
  useTarget,
  useTargetContext,
} from "./TargetContext";
import { TargetProvider } from "./TargetProvider";

test("useTargetContext throws outside a provider", () => {
  expect(() => renderHook(() => useTargetContext())).toThrow();
});

test("useTarget / useSetTarget read the provided context", () => {
  const setTarget = () => {};
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TargetContext.Provider value={{ target: 7n, setTarget }}>
      {children}
    </TargetContext.Provider>
  );
  expect(renderHook(() => useTarget(), { wrapper }).result.current).toBe(7n);
  expect(renderHook(() => useSetTarget(), { wrapper }).result.current).toBe(
    setTarget,
  );
});

test("TargetProvider clears a target that is not co-located with the player", () => {
  const identity = {} as Identity;
  const Stdb = stdbWrapper(
    {
      player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
      location_components: mockTable([
        { entityId: 1n, locationEntityId: 10n }, // player
        { entityId: 2n, locationEntityId: 20n }, // elsewhere
        { entityId: 3n, locationEntityId: 10n }, // co-located with player
      ]),
    },
    identity,
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Stdb>
      <TargetProvider>{children}</TargetProvider>
    </Stdb>
  );

  const { result } = renderHook(
    () => ({ target: useTarget(), setTarget: useSetTarget() }),
    { wrapper },
  );

  expect(result.current.target).toBeNull();
  act(() => result.current.setTarget(3n));
  expect(result.current.target).toBe(3n); // same room -> selectable
  act(() => result.current.setTarget(2n));
  expect(result.current.target).toBeNull(); // different room -> cleared
});
