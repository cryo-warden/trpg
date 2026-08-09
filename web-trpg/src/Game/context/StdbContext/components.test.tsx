import { test, expect } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { ACTIONS } from "../../assets/actions";
import {
  actionIdOf,
  mockTable,
  stdbWrapper,
} from "../../../testSupport/mockConnection";
import {
  useAction,
  useActionHotkey,
  useActionOptions,
  useAllegianceComponents,
  useEntityProminences,
  useHpComponent,
  useLocation,
  useLocationEntities,
  usePlayerEntity,
} from "./components";

const attackId = actionIdOf("bop");
const buffId = actionIdOf("divine_heal");
const moveId = actionIdOf("move");

test("useLocationEntities returns entities in the location and updates on insert", () => {
  const table = mockTable([
    { entityId: 1n, locationEntityId: 10n },
    { entityId: 2n, locationEntityId: 20n },
  ]);
  const { result } = renderHook(() => useLocationEntities(10n), {
    wrapper: stdbWrapper({ location_components: table }),
  });

  expect(result.current).toEqual([1n]);
  act(() => table.insertRow({ entityId: 3n, locationEntityId: 10n }));
  expect(result.current).toEqual([1n, 3n]);
});

test("useEntityProminences preserves order and fills missing entities", () => {
  const table = mockTable([{ entityId: 1n, prominence: 5 }]);
  // Stable array reference: a fresh array each render would re-fire the
  // subscription effect and loop (the app passes a memoized array).
  const entityIds = [1n, 2n];
  const { result } = renderHook(() => useEntityProminences(entityIds), {
    wrapper: stdbWrapper({ entity_prominence_components: table }),
  });

  expect(result.current).toEqual([
    { entityId: 1n, prominence: 5 },
    { entityId: 2n, prominence: -Infinity },
  ]);
});

test("useHpComponent finds the row by entity id, or null when absent", () => {
  const table = mockTable([{ entityId: 1n, hp: 3, mhp: 10 }]);
  const wrapper = stdbWrapper({ hp_components: table });

  const found = renderHook(() => useHpComponent(1n), { wrapper }).result.current;
  expect(found?.hp).toBe(3);
  expect(found?.mhp).toBe(10);
  expect(
    renderHook(() => useHpComponent(2n), { wrapper }).result.current,
  ).toBeNull();
  expect(
    renderHook(() => useHpComponent(null), { wrapper }).result.current,
  ).toBeNull();
});

test("useLocation returns the location entity id, or null when absent", () => {
  const table = mockTable([{ entityId: 1n, locationEntityId: 99n }]);
  const wrapper = stdbWrapper({ location_components: table });

  expect(renderHook(() => useLocation(1n), { wrapper }).result.current).toBe(99n);
  expect(renderHook(() => useLocation(2n), { wrapper }).result.current).toBeNull();
});

test("usePlayerEntity resolves the player's entity via the connected identity", () => {
  const identity = {} as Identity;
  const withPlayer = stdbWrapper(
    { player_controller_components: mockTable([{ entityId: 5n, identity }]) },
    identity,
  );
  expect(renderHook(() => usePlayerEntity(), { wrapper: withPlayer }).result.current).toBe(5n);

  const noPlayer = stdbWrapper(
    { player_controller_components: mockTable([]) },
    identity,
  );
  expect(
    renderHook(() => usePlayerEntity(), { wrapper: noPlayer }).result.current,
  ).toBeNull();
});

test("useActionHotkey maps the player's bound character code to a key", () => {
  const identity = {} as Identity;
  const wrapper = stdbWrapper(
    {
      player_controller_components: mockTable([{ entityId: 5n, identity }]),
      action_hotkeys_components: mockTable([
        { entityId: 5n, actionHotkeys: [{ actionId: attackId, characterCode: 65 }] },
      ]),
    },
    identity,
  );

  expect(
    renderHook(() => useActionHotkey(attackId), { wrapper }).result.current,
  ).toBe("A");
  // No binding for this action id.
  expect(
    renderHook(() => useActionHotkey(moveId), { wrapper }).result.current,
  ).toBeUndefined();
});

test("useAction looks up an action asset by id through the actions table", () => {
  const wrapper = stdbWrapper({});
  expect(
    renderHook(() => useAction(attackId), { wrapper }).result.current,
  ).toEqual({
    name: "bop",
    ...ACTIONS.bop,
  });
  expect(
    renderHook(() => useAction(null), { wrapper }).result.current,
  ).toBeNull();
});

test("useActionOptions keeps only actions valid against the target", () => {
  const identity = {} as Identity;
  const player = 1n;
  const target = 2n;
  const wrapper = stdbWrapper(
    {
      player_controller_components: mockTable([{ entityId: player, identity }]),
      actions_components: mockTable([
        { entityId: player, actionIds: [attackId, buffId, moveId] },
      ]),
      hp_components: mockTable([{ entityId: target, hp: 5, mhp: 10 }]),
      allegiance_components: mockTable([
        { entityId: player, allegianceEntityId: 10n },
        { entityId: target, allegianceEntityId: 20n },
      ]),
      path_components: mockTable([{ entityId: target }]),
    },
    identity,
  );

  // Enemy target (different allegiance) with hp and a path: attack + move, no buff.
  expect(
    renderHook(() => useActionOptions(target), { wrapper }).result.current,
  ).toEqual([attackId, moveId]);
});

test("createUseTable hooks expose every row of a table", () => {
  const table = mockTable([
    { entityId: 1n, allegianceEntityId: 10n },
    { entityId: 2n, allegianceEntityId: 20n },
  ]);
  const { result } = renderHook(() => useAllegianceComponents(), {
    wrapper: stdbWrapper({ allegiance_components: table }),
  });
  expect(result.current.map((component) => component.entityId)).toEqual([1n, 2n]);
});

test("table-backed hooks react to deletes and updates", () => {
  const table = mockTable([
    { entityId: 1n, locationEntityId: 10n },
    { entityId: 2n, locationEntityId: 10n },
  ]);
  const { result } = renderHook(() => useLocationEntities(10n), {
    wrapper: stdbWrapper({ location_components: table }),
  });
  expect(result.current).toEqual([1n, 2n]);

  act(() => table.deleteRow((row) => row.entityId === 1n));
  expect(result.current).toEqual([2n]);

  // Moving entity 2 to another location removes it from this location's list.
  act(() =>
    table.updateRow(
      (row) => row.entityId === 2n,
      { entityId: 2n, locationEntityId: 20n },
    ),
  );
  expect(result.current).toEqual([]);
});
