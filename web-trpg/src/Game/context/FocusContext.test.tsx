import { test, expect } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Identity } from "spacetimedb";
import { mockTable, stdbWrapper } from "../../testSupport/mockConnection";
import {
  FocusContext,
  useFocus,
  useFocusContext,
  useSetFocus,
} from "./FocusContext";
import { FocusProvider } from "./FocusProvider";

test("useFocusContext throws outside a provider", () => {
  expect(() => renderHook(() => useFocusContext())).toThrow();
});

test("useFocus / useSetFocus read the provided context", () => {
  const setFocus = () => {};
  const wrapper = ({ children }: { children: ReactNode }) => (
    <FocusContext.Provider value={{ focus: 7n, setFocus }}>
      {children}
    </FocusContext.Provider>
  );
  expect(renderHook(() => useFocus(), { wrapper }).result.current).toBe(7n);
  expect(renderHook(() => useSetFocus(), { wrapper }).result.current).toBe(
    setFocus,
  );
});

const providerWrapper = (extraTables: Record<string, unknown> = {}) => {
  const identity = {} as Identity;
  const Stdb = stdbWrapper(
    {
      player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
      location_components: mockTable([
        { entityId: 1n, locationEntityId: 10n }, // player
        { entityId: 2n, locationEntityId: 20n }, // elsewhere
        { entityId: 3n, locationEntityId: 10n }, // co-located with player
      ]),
      hp_components: mockTable([]),
      allegiance_components: mockTable([]),
      ...extraTables,
    },
    identity,
  );
  return ({ children }: { children: ReactNode }) => (
    <Stdb>
      <FocusProvider>{children}</FocusProvider>
    </Stdb>
  );
};

test("FocusProvider keeps focus on carried items and their contents", () => {
  const { result } = renderHook(
    () => ({ focus: useFocus(), setFocus: useSetFocus() }),
    {
      wrapper: providerWrapper({
        location_components: mockTable([
          { entityId: 1n, locationEntityId: 10n }, // player in room 10
          { entityId: 5n, locationEntityId: 1n }, // bag carried by player
          { entityId: 6n, locationEntityId: 5n }, // coin inside the bag
        ]),
      }),
    },
  );

  act(() => result.current.setFocus(5n));
  expect(result.current.focus).toBe(5n); // carried -> stays focused
  act(() => result.current.setFocus(6n));
  expect(result.current.focus).toBe(6n); // nested under oneself -> stays
  act(() => result.current.setFocus(10n));
  expect(result.current.focus).toBe(10n); // the room itself
});

test("FocusProvider clears focus on unknown and on dead entities", () => {
  const { result } = renderHook(
    () => ({ focus: useFocus(), setFocus: useSetFocus() }),
    {
      wrapper: providerWrapper({
        hp_components: mockTable([{ entityId: 3n, hp: 0, mhp: 5 }]),
      }),
    },
  );

  act(() => result.current.setFocus(99n)); // no location row at all
  expect(result.current.focus).toBeNull();
  act(() => result.current.setFocus(3n)); // co-located but dead
  expect(result.current.focus).toBeNull();
});

test("FocusProvider clears a focus that is not co-located with the player", () => {
  const { result } = renderHook(
    () => ({ focus: useFocus(), setFocus: useSetFocus() }),
    { wrapper: providerWrapper() },
  );

  expect(result.current.focus).toBeNull();
  act(() => result.current.setFocus(3n));
  expect(result.current.focus).toBe(3n); // same room -> in focus
  act(() => result.current.setFocus(2n));
  expect(result.current.focus).toBeNull(); // different room -> cleared
});

test("FocusProvider auto-focuses a lone hostile but never overrides a choice", () => {
  const { result } = renderHook(
    () => ({ focus: useFocus(), setFocus: useSetFocus() }),
    {
      wrapper: providerWrapper({
        // Entity 3 is a co-located hp-bearing, ACTING non-ally: the lone
        // hostile (hp alone is just attackable scenery).
        hp_components: mockTable([{ entityId: 3n, hp: 2, mhp: 2 }]),
        enemy_controller_components: mockTable([{ entityId: 3n }]),
      }),
    },
  );

  expect(result.current.focus).toBe(3n); // attention snapped to the threat
  act(() => result.current.setFocus(1n));
  expect(result.current.focus).toBe(1n); // an explicit focus stands
});
