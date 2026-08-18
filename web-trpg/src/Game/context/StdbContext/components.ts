import { useEffect, useMemo, useState } from "react";
import { getActionOptions } from "../../domain/actionOptions";
import { bitIsSet } from "../../domain/bitset";
import { ActionId, EntityId } from "../../trpg";
import { useMyAccountId } from "./account";
import { useActionAssetOf, useSpecialActionIds } from "./assetLookup";
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
  // The per-source stat caches the menus PEEL off the total to recover a
  // steady base for their hypothetical, configuration-driven numbers.
  "select * from equipment_stat_block_cache_components",
  "select * from status_stat_block_cache_components",
  "select * from item_components",
  "select * from checkpoint_object_components",
  "select * from armor_components",
  "select * from relics_components",
  "select * from stance_customizations_components",
  "select * from equipment_components",
  "select * from equipment_disabled_components",
  "select * from default_armaments_components",
  "select * from default_actions_components",
  "select * from action_state_components",
  "select * from allegiance_components",
  "select * from enemy_controller_components",
  "select * from appearance_features_components",
  "select * from ep_components",
  "select * from hp_components",
  "select * from location_components",
  "select * from path_components",
  "select * from player_controller_components",
  "select * from action_queue_components",
  "select * from entities_visited_locations",
  "select * from entities_quests_progress",
  "select * from location_map_components",
  "select * from turn_paused_components",
  "select * from path_blocker_components",
  "select * from offered_actions_components",
  "select * from open_components",
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
/** The applied EQUIPMENT contribution and the STATUS contribution, peeled off
 * the total to recover the steady base (baseline + traits + quest) the equip
 * and stance menus build their hypothetical, config-driven totals on. */
export const useEquipmentStatBlockCache = createUseComponent(
  "equipment_stat_block_cache_components",
);
export const useStatusStatBlockCache = createUseComponent(
  "status_stat_block_cache_components",
);
export const useEpComponent = createUseComponent("ep_components");
export const useHpComponent = createUseComponent("hp_components");
const useEnemyControllerComponentOf = createUseComponent(
  "enemy_controller_components",
);
const usePlayerControllerComponentOf = createUseComponent(
  "player_controller_components",
);
/** An ACTOR is anything that takes turns: a player or an enemy. Everything
 * else — scenery, containers, dropped gear — is a physical object that may
 * well have hit points, but whose vitals stay out of the way until struck
 * (see HPBar). Presentation only; the data model draws no such line. */
export const useIsActor = (entityId: EntityId | null): boolean => {
  const playerController = usePlayerControllerComponentOf(entityId);
  const enemyController = useEnemyControllerComponentOf(entityId);
  return playerController != null || enemyController != null;
};
const useLocationComponent = createUseComponent("location_components");
/** The ordered action queue (automatic entries first, then at most one
 * manual). */
export const useActionQueueComponent = createUseComponent(
  "action_queue_components",
);

export const useAllegianceComponents = createUseTable("allegiance_components");
export const useAppearanceFeaturesComponents = createUseTable(
  "appearance_features_components",
);

/** How long a vanished entity's look lingers after its rows delete —
 * plenty for its final event to bake (that happens on the very next
 * render), then the scheduled eviction reclaims the memory. */
const APPEARANCE_EVICTION_DELAY_MS = 60_000;

/** Last-known appearance features by entity: the live rows merged over a
 * RETAINED map, so an entity deleted in the same transaction as its
 * final event — an eaten cookie — still renders by its last look, never
 * as "something". Every insert/update refreshes the retained copy (the
 * merge runs on every table change); a DELETE schedules a future
 * eviction rather than evicting now — and a row reappearing (the
 * subscription scope churning) cancels it. Presentation fallback ONLY:
 * gameplay logic keeps reading the live rows. (The mutable-map-in-state
 * idiom is EventsPanel's bakedMap pattern.) */
export const useLastKnownAppearanceIndexes = (): Map<EntityId, number[]> => {
  const live = useAppearanceFeaturesComponents();
  const [retained] = useState(() => new Map<EntityId, number[]>());
  const [deletedAtMs] = useState(() => new Map<EntityId, number>());
  // The eviction bookkeeping is an EFFECT (clock reads are impure in
  // render): it only reclaims memory — the map handed out below simply
  // stops including an entry on the next table change after eviction.
  useEffect(() => {
    const liveIds = new Set(live.map((row) => row.entityId));
    const now = Date.now();
    for (const entityId of [...retained.keys()]) {
      if (liveIds.has(entityId)) {
        deletedAtMs.delete(entityId);
        continue;
      }
      const since = deletedAtMs.get(entityId);
      if (since == null) {
        deletedAtMs.set(entityId, now);
      } else if (now - since > APPEARANCE_EVICTION_DELAY_MS) {
        retained.delete(entityId);
        deletedAtMs.delete(entityId);
      }
    }
  }, [live, retained, deletedAtMs]);
  return useMemo(() => {
    for (const row of live) {
      retained.set(row.entityId, [...row.appearanceFeatureIndexes]);
    }
    // A fresh identity per change, so downstream memos re-derive.
    return new Map(retained);
  }, [live, retained]);
};

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
/** Actions the TARGET offers to anyone beside it (open, dump; later doors
 * and levers) — the actor needs no knowledge of them. */
const useOfferedActionsComponent = createUseComponent(
  "offered_actions_components",
);

/** What a SURFACE location's occupants see beyond their room: entities
 * sharing the location OF the location, recursively while each parent
 * carries the surface flag — the outdoors, and the one sky over it.
 * INSIDE locations (no flag) cut the chain immediately. Sibling ROOMS
 * (location_map carriers) and the chain's own containers are excluded:
 * this surfaces the sky, not the whole map. */
export const useVisibleOuterEntities = (
  roomEntityId: EntityId | null,
): EntityId[] => {
  const locationRows = useTableData(
    "location_components",
    (table) => [...table.iter()],
    [],
  );
  const roomRows = useTableData(
    "location_map_components",
    (table) => [...table.iter()],
    [],
  );
  return useMemo(() => {
    if (roomEntityId == null) {
      return [];
    }
    const edgeOf = new Map(locationRows.map((row) => [row.entityId, row]));
    const mapRooms = new Set(roomRows.map((row) => row.entityId));
    const visible: EntityId[] = [];
    const chain = new Set<EntityId>([roomEntityId]);
    let current = roomEntityId;
    // Bounded walk: a containment cycle must not hang the client. The
    // KIND rides the location EDGE: only Exterior edges see through.
    for (let depth = 0; depth < 8; depth++) {
      const edge = edgeOf.get(current);
      if (edge == null || edge.kind.tag !== "Exterior") {
        break;
      }
      const parent = edge.locationEntityId;
      if (chain.has(parent)) {
        break;
      }
      chain.add(parent);
      for (const row of locationRows) {
        if (
          row.locationEntityId === parent &&
          !chain.has(row.entityId) &&
          !mapRooms.has(row.entityId)
        ) {
          visible.push(row.entityId);
        }
      }
      current = parent;
    }
    return visible;
  }, [roomEntityId, locationRows, roomRows]);
};

/** The AUTHORED offers of an entity (its offered_actions component) —
 * what the Activate pseudo-slot fires for the focus. */
export const useOfferedActionIdsOf = (entityId: EntityId | null): ActionId[] => {
  const offered = useOfferedActionsComponent(entityId);
  return useMemo(() => [...(offered?.actionIds ?? [])], [offered]);
};

/** Path entities whose blocker still stands: they render as nothing (no
 * panel), so they must also CONSUME nothing — no target hotkey, no list
 * slot. One derivation for every surface that lays entities out. */
export const useBlockedPathIds = (): Set<EntityId> => {
  const blockerRows = useTableData(
    "path_blocker_components",
    (table) => [...table.iter()],
    [],
  );
  const hpRows = useTableData("hp_components", (table) => [...table.iter()], []);
  return useMemo(() => {
    const standing = new Set(hpRows.map((row) => row.entityId));
    return new Set(
      blockerRows
        .filter((row) => standing.has(row.blockerEntityId))
        .map((row) => row.entityId),
    );
  }, [blockerRows, hpRows]);
};

/** The revealed insides of OPEN containers among the given co-located
 * entities: their contents stay where they are, intact, but render (and
 * are takeable) as if laid out beside the container. */
export const useOpenContainerContents = (
  containerCandidates: EntityId[],
): EntityId[] => {
  const openRows = useTableData(
    "open_components",
    (table) => [...table.iter()],
    [],
  );
  const locationRows = useTableData(
    "location_components",
    (table) => [...table.iter()],
    [],
  );
  return useMemo(() => {
    const openHere = new Set(
      openRows
        .map((row) => row.entityId)
        .filter((entityId) =>
          containerCandidates.some((candidate) => candidate === entityId),
        ),
    );
    return locationRows
      .filter((row) => openHere.has(row.locationEntityId))
      .map((row) => row.entityId);
  }, [openRows, locationRows, containerCandidates]);
};

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

/** The stat block an item entity's asset contributes — gear when worn or
 * wielded, a quest item's per-bit grant when eaten. Null for non-items
 * and unknown refs. Feeds the entity card's stat summary line. */
export const useItemAssetStatBlock = (entityId: EntityId | null) => {
  const item = useItemComponent(entityId);
  const armaments = useTableData("armaments", (t) => [...t.iter()], []);
  const armors = useTableData("armors", (t) => [...t.iter()], []);
  const relics = useTableData("relics", (t) => [...t.iter()], []);
  const quests = useTableData("quests", (t) => [...t.iter()], []);
  return useMemo(() => {
    const ref = item?.itemRef;
    if (ref == null) {
      return null;
    }
    if (ref.tag === "QuestItem") {
      return (
        quests.find((row) => row.id === ref.value.questId)?.perBitStatBlock ??
        null
      );
    }
    const rows =
      ref.tag === "Armament" ? armaments : ref.tag === "Armor" ? armors : relics;
    return rows.find((row) => row.id === ref.value)?.statBlock ?? null;
  }, [item, armaments, armors, relics, quests]);
};

/** This carried item ENTITY counts as equipped/worn: membership in the
 * DEFAULT armament slot or the worn armor/relic configs — so an item's
 * Equip/Unequip options can never disagree with its highlight anywhere
 * else. An item is one entity; membership is the whole rule. */
const useTargetIsEquipped = (focus: Focus): boolean => {
  const playerEntity = usePlayerEntity();
  const targetItem = useItemComponent(focus);
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
    if (ref.tag === "QuestItem") {
      // Quest items are eaten, never worn.
      return false;
    }
    // The focused item ENTITY is on when its id is in the matching config:
    // the default armaments, the worn armor, or the worn relics.
    const equipped: EntityId[] =
      ref.tag === "Armament"
        ? [...(defaultArmaments?.armamentEntityIds ?? [])]
        : ref.tag === "Armor"
          ? armor == null
            ? []
            : [armor.armorEntityId]
          : [...(relics?.relicEntityIds ?? [])];
    return equipped.includes(focus);
  }, [focus, playerEntity, targetItem, defaultArmaments, armor, relics]);
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
  const targetOfferedActions = useOfferedActionsComponent(focus);
  const playerLocation = useLocationComponent(playerEntity);
  const specialActionIds = useSpecialActionIds();
  const actorTotal = useTotalStatBlockComponent(playerEntity);
  // Take reach: the target's own container, when it has one, must be
  // the player's room — or an OPEN container standing in it.
  const targetHolder = useLocationComponent(
    targetLocation?.locationEntityId ?? null,
  );
  const targetHolderOpen = useTableData(
    "open_components",
    (table) =>
      targetLocation == null
        ? false
        : [...table.iter()].some(
            (row) => row.entityId === targetLocation.locationEntityId,
          ),
    [targetLocation],
  );

  return useMemo(() => {
    const targetCoLocatedWithPlayer =
      playerLocation != null &&
      targetLocation != null &&
      playerLocation.locationEntityId === targetLocation.locationEntityId;
    const targetInOpenContainerHere =
      targetHolderOpen &&
      playerLocation != null &&
      targetHolder != null &&
      targetHolder.locationEntityId === playerLocation.locationEntityId;
    return getActionOptions({
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
      targetOfferedActionIds: targetOfferedActions?.actionIds ?? [],
      targetCoLocatedWithPlayer,
      specialActionIds,
      targetWithinTakeReach:
        targetCoLocatedWithPlayer || targetInOpenContainerHere,
      actorStats: actorTotal?.statBlock ?? null,
      playerEntity,
      target: focus,
      playerAllegianceId: playerAllegiance?.allegianceEntityId ?? null,
      targetAllegianceId: targetAllegiance?.allegianceEntityId ?? null,
    });
  }, [
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
    targetOfferedActions,
    playerLocation,
    specialActionIds,
    actorTotal,
    targetHolder,
    targetHolderOpen,
    focus,
  ]);
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
