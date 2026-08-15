import { test, expect } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { ACTIONS } from "../../assets/actions";
import { useActionAsset } from "./assetLookup";
import {
  actionIdOf,
  mockTable,
  stdbWrapper,
} from "../../../testSupport/mockConnection";
import {
  useActionOptions,
  useAllegianceComponents,
  useEntityPresentations,
  usePinnedActions,
  useHpComponent,
  useLocation,
  useLocationEntities,
  usePlayerEntity,
  useVisibleOuterEntities,
} from "./components";

const attackId = actionIdOf("bop");
const buffId = actionIdOf("heal");
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

test("useEntityPresentations derives flags from component presence", () => {
  // Stable array reference: a fresh array each render would re-fire the
  // subscription effect and loop (the app passes a memoized array).
  const entityIds = [1n, 2n];
  const { result } = renderHook(() => useEntityPresentations(entityIds), {
    wrapper: stdbWrapper({
      path_components: mockTable([{ entityId: 1n }]),
      player_controller_components: mockTable([]),
      hp_components: mockTable([{ entityId: 2n, hp: 1, mhp: 1 }]),
    }),
  });

  expect(result.current).toEqual([
    { entityId: 1n, hasPath: true, isPlayerControlled: false, hasHp: false },
    { entityId: 2n, hasPath: false, isPlayerControlled: false, hasHp: true },
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
    { player_controller_components: mockTable([{ entityId: 5n, accountId: 1n }]) },
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

test("usePinnedActions returns the player's ordered pinned action ids", () => {
  const identity = {} as Identity;
  const wrapper = stdbWrapper(
    {
      player_controller_components: mockTable([{ entityId: 5n, accountId: 1n }]),
      pinned_actions_components: mockTable([
        { entityId: 5n, actionIds: [attackId, moveId] },
      ]),
    },
    identity,
  );

  expect(
    renderHook(() => usePinnedActions(), { wrapper }).result.current,
  ).toEqual([attackId, moveId]);
});

test("useActionAsset looks up an action asset by id through the actions table", () => {
  const wrapper = stdbWrapper({});
  expect(
    renderHook(() => useActionAsset(attackId), { wrapper }).result.current,
  ).toEqual({
    name: "bop",
    ...ACTIONS.bop,
  });
  expect(
    renderHook(() => useActionAsset(null), { wrapper }).result.current,
  ).toBeNull();
});

test("useActionOptions keeps only actions valid against the target", () => {
  const identity = {} as Identity;
  const player = 1n;
  const target = 2n;
  const wrapper = stdbWrapper(
    {
      player_controller_components: mockTable([
        { entityId: player, accountId: 1n },
      ]),
      actions_components: mockTable([
        { entityId: player, actionIds: [attackId, buffId, moveId] },
      ]),
      hp_components: mockTable([{ entityId: target, hp: 5, mhp: 10 }]),
      allegiance_components: mockTable([
        { entityId: player, allegianceEntityId: 10n },
        { entityId: target, allegianceEntityId: 20n },
      ]),
      path_components: mockTable([{ entityId: target }]),
      // Movement is OFFERED by the path; the offer reaches only the
      // co-located, and its gait requirement reads the player's total.
      offered_actions_components: mockTable([
        { entityId: target, actionIds: [moveId] },
      ]),
      location_components: mockTable([
        { entityId: player, locationEntityId: 100n },
        { entityId: target, locationEntityId: 100n },
      ]),
      total_stat_block_components: mockTable([
        { entityId: player, statBlock: { gait: 2 } },
      ]),
    },
    identity,
  );

  // Enemy target (different allegiance) with hp and a path: attack + move, no buff.
  expect(
    renderHook(() => useActionOptions(target), { wrapper }).result.current,
  ).toEqual([attackId, moveId]);
});

test("a surface room sees the sky through the surface chain; inside cuts it", () => {
  const identity = {} as Identity;
  // Room 10 (surface) sits in the outdoors 50 (surface), which sits on
  // the world 60. The sky 51 hangs in the outdoors, a star 61 in the
  // world; sibling room 11 also sits in the outdoors but is a MAP room.
  const tables = {
    surface_components: mockTable([{ entityId: 10n }, { entityId: 50n }]),
    location_components: mockTable([
      { entityId: 10n, locationEntityId: 50n },
      { entityId: 11n, locationEntityId: 50n },
      { entityId: 51n, locationEntityId: 50n },
      { entityId: 50n, locationEntityId: 60n },
      { entityId: 61n, locationEntityId: 60n },
    ]),
    location_map_components: mockTable([
      { entityId: 10n, locationMapEntityId: 99n },
      { entityId: 11n, locationMapEntityId: 99n },
    ]),
  };
  const outdoors = renderHook(() => useVisibleOuterEntities(10n), {
    wrapper: stdbWrapper(tables, identity),
  });
  // The sky and the star show; the sibling map room does not.
  expect(outdoors.result.current).toEqual([51n, 61n]);

  // An INSIDE room (no surface flag) sees nothing beyond itself.
  const inside = renderHook(() => useVisibleOuterEntities(11n), {
    wrapper: stdbWrapper(tables, identity),
  });
  expect(inside.result.current).toEqual([]);
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
