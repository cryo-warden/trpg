import { createElement, type ReactNode } from "react";
import type { Identity } from "spacetimedb";
import type { DbConnection } from "../stdb";
import type { StatBlockAsset } from "../stdb/types";
import { StdbContext } from "../Game/context/StdbContext/StdbContext";
import { ACTIONS, ActionName } from "../Game/assets/actions";
import {
  APPEARANCE_FEATURES,
  AppearanceFeatureName,
} from "../Game/assets/appearance_features";
import { ARMAMENTS, ArmamentName } from "../Game/assets/armaments";
import { ARMORS, ArmorName } from "../Game/assets/armors";
import { QUESTS, QuestName } from "../Game/assets/quests";
import { RELICS, RelicName } from "../Game/assets/relics";
import { STANCES, StanceName } from "../Game/assets/stances";

/**
 * Test-only, in-memory stand-ins for a live SpacetimeDB connection. They
 * implement just the surface the client hooks touch — `iter`, the `entityId`
 * and `identity` unique indexes, and the insert/delete/update subscriptions —
 * so hooks and components can be rendered against injected data with no real
 * stdb. Isolated to the test tsconfig; never imported by app code.
 */

type Callback = (...args: unknown[]) => void;

export type MockTable<Row> = {
  iter: () => Row[];
  count: () => number;
  onInsert: (cb: Callback) => void;
  removeOnInsert: (cb: Callback) => void;
  onDelete: (cb: Callback) => void;
  removeOnDelete: (cb: Callback) => void;
  onUpdate: (cb: Callback) => void;
  removeOnUpdate: (cb: Callback) => void;
  entityId: { find: (id: bigint) => Row | undefined };
  identity: { find: (id: Identity) => Row | undefined };
  id: { find: (id: number) => Row | undefined };
  account_id: { find: (id: bigint) => Row | undefined };
  /** Test drivers: mutate rows and fire the matching subscription. */
  insertRow: (row: Row) => void;
  updateRow: (match: (row: Row) => boolean, next: Row) => void;
  deleteRow: (match: (row: Row) => boolean) => void;
};

export const mockTable = <Row>(initial: Row[] = []): MockTable<Row> => {
  let rows = [...initial];
  const inserts = new Set<Callback>();
  const deletes = new Set<Callback>();
  const updates = new Set<Callback>();
  // SpacetimeDB row callbacks receive (eventContext, row[, newRow]); the mock
  // passes a stub context so useTableStream (which reads the row) works too.
  const fire = (cbs: Set<Callback>, ...args: unknown[]) =>
    cbs.forEach((cb) => cb({}, ...args));
  const findBy = (field: string, value: unknown): Row | undefined =>
    rows.find((row) => (row as Record<string, unknown>)[field] === value);
  return {
    iter: () => rows,
    count: () => rows.length,
    onInsert: (cb) => void inserts.add(cb),
    removeOnInsert: (cb) => void inserts.delete(cb),
    onDelete: (cb) => void deletes.add(cb),
    removeOnDelete: (cb) => void deletes.delete(cb),
    onUpdate: (cb) => void updates.add(cb),
    removeOnUpdate: (cb) => void updates.delete(cb),
    entityId: { find: (id) => findBy("entityId", id) },
    identity: { find: (id) => findBy("identity", id) },
    id: { find: (id) => findBy("id", id) },
    account_id: { find: (id) => findBy("accountId", id) },
    insertRow: (row) => {
      rows = [...rows, row];
      fire(inserts, row);
    },
    updateRow: (match, next) => {
      const previous = rows.find(match);
      rows = rows.map((row) => (match(row) ? next : row));
      fire(updates, previous, next);
    },
    deleteRow: (match) => {
      const removed = rows.find(match);
      rows = rows.filter((row) => !match(row));
      fire(deletes, removed);
    },
  };
};

// Mock asset-table rows mirroring a push of the local Records: ids follow the
// Records' enumeration order, exactly as push_assets interns them. Tests act
// as the server here; app code never computes an asset id this way —
// including the name -> id resolution inside stat blocks, mirrored below.
const resolveMockStatBlock = (asset: StatBlockAsset) => {
  const { actionNames, appearanceFeatureNames, ...ints } = asset;
  return {
    ...ints,
    actionIds: actionNames.map((name) => actionIdOf(name as ActionName)),
    appearanceFeatureIds: appearanceFeatureNames.map((name) =>
      appearanceFeatureIndexOf(name as AppearanceFeatureName),
    ),
  };
};

export const mockAssetTables = () => ({
  actions: mockTable(
    Object.keys(ACTIONS).map((name, id) => ({ id, name })),
  ),
  action_rounds: mockTable(
    Object.values(ACTIONS).flatMap((action, actionId) =>
      action.rounds.map((round, sequenceIndex) => ({
        actionId,
        sequenceIndex,
        effects: [...round.effects],
        interruptible: round.interruptible,
      })),
    ),
  ),
  appearance_features: mockTable(
    Object.keys(APPEARANCE_FEATURES).map((name, index) => ({ index, name })),
  ),
  stances: mockTable(
    Object.entries(STANCES).map(([name, stance], id) => ({
      id,
      name,
      requirements: stance.requirements,
      statBlock: resolveMockStatBlock(stance.statBlock),
    })),
  ),
  armaments: mockTable(
    Object.entries(ARMAMENTS).map(([name, statBlock], id) => ({
      id,
      name,
      statBlock: resolveMockStatBlock(statBlock),
    })),
  ),
  armors: mockTable(
    Object.entries(ARMORS).map(([name, statBlock], id) => ({
      id,
      name,
      statBlock: resolveMockStatBlock(statBlock),
    })),
  ),
  relics: mockTable(
    Object.entries(RELICS).map(([name, statBlock], id) => ({
      id,
      name,
      statBlock: resolveMockStatBlock(statBlock),
    })),
  ),
  quests: mockTable(
    Object.entries(QUESTS).map(([name, quest], id) => ({
      id,
      name,
      perBitStatBlock: resolveMockStatBlock(quest.perBitStatBlock),
      bitCount: quest.bitCount,
    })),
  ),
});

export const actionIdOf = (name: ActionName): number =>
  Object.keys(ACTIONS).indexOf(name);

export const stanceIdOf = (name: StanceName): number =>
  Object.keys(STANCES).indexOf(name);

export const armamentIdOf = (name: ArmamentName): number =>
  Object.keys(ARMAMENTS).indexOf(name);

export const armorIdOf = (name: ArmorName): number =>
  Object.keys(ARMORS).indexOf(name);

export const relicIdOf = (name: RelicName): number =>
  Object.keys(RELICS).indexOf(name);

export const questIdOf = (name: QuestName): number =>
  Object.keys(QUESTS).indexOf(name);

/** The account every mocked identity belongs to unless a test overrides the
 * account_identities table. */
export const MOCK_ACCOUNT_ID = 1n;

export const appearanceFeatureIndexOf = (name: AppearanceFeatureName): number =>
  Object.keys(APPEARANCE_FEATURES).indexOf(name);

/**
 * A React wrapper (for `renderHook`/`render`) that injects a mock connection
 * built from the given tables (keyed by table name) and optional player
 * identity via StdbContext. Tables are typed loosely so mock tables of
 * different row types can be combined.
 */
export const stdbWrapper = (
  tables: Record<string, unknown>,
  identity: Identity = {} as Identity,
  reducers: Record<string, unknown> = {},
) => {
  const connection = {
    db: {
      ...mockAssetTables(),
      account_identities: mockTable([
        { identity, accountId: MOCK_ACCOUNT_ID },
      ]),
      login_requests: mockTable([]),
      login_responses: mockTable([]),
      // Empty defaults for the tables the provider stack reads, so tests
      // only declare the rows they actually care about.
      player_controller_components: mockTable([]),
      location_components: mockTable([]),
      hp_components: mockTable([]),
      ep_components: mockTable([]),
      attack_components: mockTable([]),
      allegiance_components: mockTable([]),
      enemy_controller_components: mockTable([]),
      path_components: mockTable([]),
      actions_components: mockTable([]),
      active_stance_components: mockTable([]),
      total_stat_block_components: mockTable([]),
      fear_status_components: mockTable([]),
      courage_status_components: mockTable([]),
      action_state_components: mockTable([]),
      item_components: mockTable([]),
      checkpoint_object_components: mockTable([]),
      checkpoint_components: mockTable([]),
      armor_components: mockTable([]),
      relics_components: mockTable([]),
      stance_loadouts_components: mockTable([]),
      equipment_components: mockTable([]),
      default_armaments_components: mockTable([]),
      queued_action_state_components: mockTable([]),
      entities_visited_locations: mockTable([]),
      entities_quests_progress: mockTable([]),
      location_map_components: mockTable([]),
      turn_paused_components: mockTable([]),
      path_blocker_components: mockTable([]),
      offered_actions_components: mockTable([]),
      open_components: mockTable([]),
      action_hotkeys_components: mockTable([]),
      appearance_features_components: mockTable([]),
      ...tables,
    },
    reducers,
  } as unknown as DbConnection;
  const value = { connection, identity, synced: true };
  return function StdbWrapper({ children }: { children: ReactNode }) {
    return createElement(StdbContext.Provider, { value }, children);
  };
};
