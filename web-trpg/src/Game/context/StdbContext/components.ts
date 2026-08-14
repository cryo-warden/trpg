import { useMemo } from "react";
import { getActionOptions } from "../../domain/actionOptions";
import { bitIsSet } from "../../domain/bitset";
import { assetInstanceIsOn } from "../../domain/countedAssets";
import { ActionId, EntityId } from "../../trpg";
import { useMyAccountId } from "./account";
import { useActionAssetOf } from "./assetLookup";
import { RowType } from "./RowType";
import { createUseTable } from "./useTable";
import { RemoteTables, useTableData } from "./useTableData";
import { ActionPhase, actionPhaseOf } from "../../domain/actionPhase";
import { EntityPresentation } from "../../domain/prominence";
import { selectActiveHostiles, selectHostiles } from "../../domain/threat";
import {
  selectEntityPresentations,
  selectLocationEntities,
} from "./tableSelectors";
import { Focus } from "../FocusContext";

const createUseComponent =
  <T extends keyof RemoteTables>(tableName: T) =>
  (entityId: EntityId | null): RowType<T> | null =>
    useTableData(
      tableName,
      (table): RowType<T> | null => {
        if (!("entityId" in table)) {
          throw new Error(
            `Table "${tableName}" used with useComponent does not have an entityId unique index.`,
          );
        }

        if (entityId == null) {
          return null;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (table.entityId as any).find(entityId) ?? null;
      },
      [entityId],
    );

export const componentQueries = [
  "select * from pinned_actions_components",
  "select * from actions_components",
  "select * from active_stance_components",
  "select * from total_stat_block_components",
  "select * from item_components",
  "select * from checkpoint_object_components",
  "select * from armor_components",
  "select * from relics_components",
  "select * from stance_loadouts_components",
  "select * from equipment_components",
  "select * from default_armaments_components",
  "select * from action_state_components",
  "select * from allegiance_components",
  "select * from enemy_controller_components",
  "select * from appearance_features_components",
  "select * from ep_components",
  "select * from hp_components",
  "select * from location_components",
  "select * from path_components",
  "select * from player_controller_components",
  "select * from queued_action_state_components",
  "select * from entities_visited_locations",
  "select * from entities_quests_progress",
  "select * from location_map_components",
  "select * from turn_paused_components",
  "select * from path_blocker_components",
];

const usePinnedActionsComponent = createUseComponent(
  "pinned_actions_components",
);
export const useActionStateComponent = createUseComponent(
  "action_state_components",
);
export const useActionsComponent = createUseComponent("actions_components");
/** The stored applied total: rigid stats (morale, size, properties) read
 * straight from here rather than per-stat components. */
export const useTotalStatBlockComponent = createUseComponent(
  "total_stat_block_components",
);
export const useEpComponent = createUseComponent("ep_components");
export const useHpComponent = createUseComponent("hp_components");
const useLocationComponent = createUseComponent("location_components");
export const useQueuedActionStateComponent = createUseComponent(
  "queued_action_state_components",
);

export const useAllegianceComponents = createUseTable("allegiance_components");
export const useAppearanceFeaturesComponents = createUseTable(
  "appearance_features_components",
);

const useAllegianceComponent = createUseComponent("allegiance_components");
export const usePathComponent = createUseComponent("path_components");

/** The location entity ids the player's entity has ever stood in. Paths to
 * places OUTSIDE this set are the "more interesting" ones. */
export const useMyVisitedLocationIds = (): Set<EntityId> => {
  const playerEntity = usePlayerEntity();
  const visitedRows = useTableData(
    "entities_visited_locations",
    (table) => [...table.iter()],
    [],
  );
  return useMemo(
    () =>
      new Set(
        visitedRows
          .filter((row) => row.visitorEntityId === playerEntity)
          .map((row) => row.locationEntityId),
      ),
    [visitedRows, playerEntity],
  );
};
const useItemComponent = createUseComponent("item_components");
const useCheckpointObjectComponent = createUseComponent(
  "checkpoint_object_components",
);

export const useLocation = (entityId: EntityId | null) => {
  const component = useLocationComponent(entityId);
  if (component == null) {
    return null;
  }

  return component.locationEntityId;
};

/** A quest item's freshness FOR THE VIEWER — null when the entity is no
 * quest item at all. "Stinky" the moment the viewer holds its bit,
 * EVERYWHERE it renders (on the ground before pickup included), so a
 * duplicate never masquerades as a reward. Per-viewer on purpose: my
 * stinky cookie is a companion's fresh one. */
export const useQuestItemFreshness = (
  entityId: EntityId | null,
): "fresh" | "stinky" | null => {
  const playerEntity = usePlayerEntity();
  const item = useItemComponent(entityId);
  const progressRows = useTableData(
    "entities_quests_progress",
    (table) => [...table.iter()],
    [],
  );
  return useMemo(() => {
    const ref = item?.itemRef;
    if (ref == null || ref.tag !== "QuestItem") {
      return null;
    }
    const row = progressRows.find(
      (progress) =>
        progress.entityId === playerEntity &&
        progress.questId === ref.value.questId,
    );
    return row != null && bitIsSet(row.bits, ref.value.index)
      ? "stinky"
      : "fresh";
  }, [item, progressRows, playerEntity]);
};

/** This carried item INSTANCE counts as equipped/worn: the same counted-
 * multiset rule the menus use, so an item's Equip/Unequip options can
 * never disagree with its highlight anywhere else. */
const useTargetIsEquipped = (focus: Focus): boolean => {
  const playerEntity = usePlayerEntity();
  const targetItem = useItemComponent(focus);
  const locationRows = useTableData(
    "location_components",
    (table) => [...table.iter()],
    [],
  );
  const itemRows = useTableData("item_components", (table) => [...table.iter()], []);
  // Equip/unequip edit the DEFAULT slot, so "equipped" here means
  // membership in the default set — not whatever a stance override
  // currently holds in hand.
  const defaultArmaments = useTableData(
    "default_armaments_components",
    (table) =>
      playerEntity == null
        ? null
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((table.entityId as any).find(playerEntity) ?? null),
    [playerEntity],
  );
  const armor = useTableData(
    "armor_components",
    (table) =>
      playerEntity == null
        ? null
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((table.entityId as any).find(playerEntity) ?? null),
    [playerEntity],
  );
  const relics = useTableData(
    "relics_components",
    (table) =>
      playerEntity == null
        ? null
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((table.entityId as any).find(playerEntity) ?? null),
    [playerEntity],
  );

  return useMemo(() => {
    if (focus == null || playerEntity == null || targetItem == null) {
      return false;
    }
    const ref = targetItem.itemRef;
    if (ref.tag === "Armor") {
      return armor?.armorId === ref.value;
    }
    if (ref.tag === "QuestItem") {
      // Quest items are eaten, never worn.
      return false;
    }
    // Counted kinds: which instances of this asset the player carries, in
    // stable row order, decides whether THIS instance is on.
    const carried = new Set(
      locationRows
        .filter((row) => row.locationEntityId === playerEntity)
        .map((row) => row.entityId),
    );
    const carriedSameKind = itemRows.flatMap((row) => {
      const rowRef = row.itemRef;
      return carried.has(row.entityId) &&
        rowRef.tag !== "QuestItem" &&
        rowRef.tag === ref.tag
        ? [{ entityId: row.entityId, assetId: rowRef.value }]
        : [];
    });
    const onIds: number[] =
      ref.tag === "Armament"
        ? [...(defaultArmaments?.armamentIds ?? [])]
        : [...(relics?.relicIds ?? [])];
    return assetInstanceIsOn({
      ids: onIds,
      item: { entityId: focus, assetId: ref.value },
      items: carriedSameKind,
    });
  }, [
    focus,
    playerEntity,
    targetItem,
    locationRows,
    itemRows,
    defaultArmaments,
    armor,
    relics,
  ]);
};

/** Actions valid with the focused entity as their would-be target. */
export const useActionOptions = (focus: Focus): ActionId[] => {
  const playerEntity = usePlayerEntity();
  const actionsComponent = useActionsComponent(playerEntity);
  const actionAssetOf = useActionAssetOf();

  const targetHp = useHpComponent(focus);
  const playerAllegiance = useAllegianceComponent(playerEntity);
  const targetAllegiance = useAllegianceComponent(focus);
  const targetPath = usePathComponent(focus);
  const targetItem = useItemComponent(focus);
  const targetLocation = useLocationComponent(focus);
  const targetCheckpointObject = useCheckpointObjectComponent(focus);
  const targetIsEquipped = useTargetIsEquipped(focus);
  const targetQuestItemFreshness = useQuestItemFreshness(focus);

  return useMemo(
    () =>
      getActionOptions({
        actionIds: actionsComponent?.actionIds ?? [],
        actionAssetOf,
        targetHasHp: !!targetHp,
        targetHasPath: !!targetPath,
        targetHasItem: !!targetItem,
        targetCarriedByPlayer:
          playerEntity != null &&
          targetLocation?.locationEntityId === playerEntity,
        targetIsEquipped,
        targetHasCheckpointObject: !!targetCheckpointObject,
        targetQuestItemFreshness,
        playerEntity,
        target: focus,
        playerAllegianceId: playerAllegiance?.allegianceEntityId ?? null,
        targetAllegianceId: targetAllegiance?.allegianceEntityId ?? null,
      }),
    [
      actionsComponent,
      actionAssetOf,
      playerEntity,
      targetHp,
      playerAllegiance,
      targetAllegiance,
      targetPath,
      targetItem,
      targetLocation,
      targetCheckpointObject,
      targetIsEquipped,
      targetQuestItemFreshness,
      focus,
    ],
  );
};

const useThreatInputs = () => {
  const playerEntity = usePlayerEntity();
  const location = useLocation(playerEntity);
  const cohabitantIds = useLocationEntities(location);
  const playerAllegiance = useAllegianceComponent(playerEntity);
  const hpRows = useTableData("hp_components", (table) => [...table.iter()], []);
  const allegianceRows = useTableData(
    "allegiance_components",
    (table) => [...table.iter()],
    [],
  );
  const enemyControllerRows = useTableData(
    "enemy_controller_components",
    (table) => [...table.iter()],
    [],
  );
  return useMemo(() => {
    const hpById = new Map(hpRows.map((row) => [row.entityId, row.hp]));
    const controllerIds = new Set(
      enemyControllerRows.map((row) => row.entityId),
    );
    const allegianceById = new Map(
      allegianceRows.map((row) => [row.entityId, row.allegianceEntityId]),
    );
    return {
      viewer: playerEntity,
      viewerAllegianceId: playerAllegiance?.allegianceEntityId ?? null,
      cohabitants: cohabitantIds.map((entityId) => ({
        entityId,
        hasHp: hpById.has(entityId),
        canAct: controllerIds.has(entityId),
        isDead: hpById.has(entityId) && (hpById.get(entityId) ?? 0) <= 0,
        allegianceId: allegianceById.get(entityId) ?? null,
      })),
    };
  }, [
    playerEntity,
    playerAllegiance,
    cohabitantIds,
    hpRows,
    allegianceRows,
    enemyControllerRows,
  ]);
};

/** The threat DISPLAY list (alive and fallen alike); non-empty means the
 * threat panel shows. */
export const useHostiles = (): EntityId[] => {
  const inputs = useThreatInputs();
  return useMemo(() => selectHostiles(inputs), [inputs]);
};

/** The threats still fighting — the only default-target candidates. */
export const useActiveHostiles = (): EntityId[] => {
  const inputs = useThreatInputs();
  return useMemo(() => selectActiveHostiles(inputs), [inputs]);
};

const useActiveStanceComponent = createUseComponent("active_stance_components");

/** The player's active stance id, or null before one is adopted. */
export const useMyActiveStanceId = (): number | null => {
  const playerEntity = usePlayerEntity();
  const activeStance = useActiveStanceComponent(playerEntity);
  return activeStance?.stanceId ?? null;
};

/** The player's ordered pinned actions; bar position auto-assigns the
 * numeric hotkey (1..9, then 0). */
export const usePinnedActions = (): ActionId[] => {
  const playerEntity = usePlayerEntity();
  const pinnedActionsComponent = usePinnedActionsComponent(playerEntity);
  return pinnedActionsComponent?.actionIds ?? [];
};

/** The entity's current action phase, or null when it is not acting. Empty
 * rounds are rendered visibly as preparation or recovery. */
export const useActionPhase = (entityId: EntityId | null): ActionPhase | null => {
  const actionState = useActionStateComponent(entityId);
  const roundRows = useTableData(
    "action_rounds",
    (table) => [...table.iter()],
    [],
  );
  return useMemo(() => {
    if (actionState == null) {
      return null;
    }
    return actionPhaseOf({
      sequenceIndex: actionState.sequenceIndex,
      rounds: roundRows
        .filter((round) => round.actionId === actionState.actionId)
        .map((round) => ({
          sequenceIndex: round.sequenceIndex,
          hasEffects: round.effects.length > 0,
        })),
    });
  }, [actionState, roundRows]);
};

/** Presentation flags per entity, derived from component presence — the
 * server stores no ranking; prominence is pure client presentation. */
export const useEntityPresentations = (
  entityIds: EntityId[],
): EntityPresentation[] => {
  const pathRows = useTableData(
    "path_components",
    (table) => [...table.iter()],
    [],
  );
  const playerControllerRows = useTableData(
    "player_controller_components",
    (table) => [...table.iter()],
    [],
  );
  const hpRows = useTableData("hp_components", (table) => [...table.iter()], []);
  return useMemo(
    () =>
      selectEntityPresentations(
        {
          paths: { iter: () => pathRows },
          playerControllers: { iter: () => playerControllerRows },
          hps: { iter: () => hpRows },
        },
        entityIds,
      ),
    [entityIds, pathRows, playerControllerRows, hpRows],
  );
};

export const useLocationEntities = (locationEntityId: EntityId | null) => {
  return useTableData(
    "location_components",
    (table) => selectLocationEntities(table, locationEntityId),
    [locationEntityId],
  );
};

const usePlayerControllerComponent = () => {
  // Ownership hangs off the ACCOUNT, never the connection identity.
  const accountId = useMyAccountId();
  return useTableData(
    "player_controller_components",
    (table) => {
      if (accountId == null) {
        return null;
      }
      // TODO Remove "as any" cast after ranged index is correctly replaced with unique index in generated type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (table.account_id as any).find(accountId) ?? null;
    },
    [accountId],
  );
};

export const usePlayerEntity = (): EntityId | null => {
  const playerControllerComponent = usePlayerControllerComponent();
  if (playerControllerComponent == null) {
    return null;
  }

  return playerControllerComponent.entityId;
};

const useLocationMapComponent = createUseComponent("location_map_components");
const useTurnPausedComponent = createUseComponent("turn_paused_components");
const usePathBlockerComponent = createUseComponent("path_blocker_components");

/** A guarded path stays INVISIBLE while its breakable blocker still
 * stands (has hp): hidden rooms and unopened backward shortcuts simply
 * do not read as paths. Smashing the blocker reveals the way. */
export const useIsBlockedPath = (entityId: EntityId | null): boolean => {
  const pathBlocker = usePathBlockerComponent(entityId);
  const blockerHp = useHpComponent(pathBlocker?.blockerEntityId ?? null);
  return pathBlocker != null && blockerHp != null;
};

/** Whether MY map instance's turn is on hold — the server-derived
 * turn_paused flag on the instance my current room belongs to. True
 * means the world is waiting for an action assignment (mine, unless a
 * future co-located player owes theirs). */
export const useMyTurnPaused = (): boolean => {
  const playerEntity = usePlayerEntity();
  const location = useLocationComponent(playerEntity);
  const roomMap = useLocationMapComponent(location?.locationEntityId ?? null);
  const paused = useTurnPausedComponent(roomMap?.locationMapEntityId ?? null);
  return paused != null;
};
