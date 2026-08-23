import { useMemo } from "react";
import { EntityId } from "../../trpg";
import { GroupedBlock } from "../../domain/statBlock";
import { usePlayerEntity } from "./components";
import { useTableData } from "./useTableData";

export type GearKind = "Armament" | "Armor" | "Relic";

export type OwnedItem = {
  entityId: EntityId;
  kind: GearKind | "QuestItem";
};

/** Everything the player carries (carrying IS location). An item's name and
 * look render through its appearance features (see EntityName), never a gear
 * asset table — here we need only its entity and its equip-slot kind. */
export const useOwnedItems = (): OwnedItem[] => {
  const playerEntity = usePlayerEntity();
  const locationRows = useTableData(
    "location_components",
    (t) => [...t.iter()],
    [],
  );
  const itemRows = useTableData("item_components", (t) => [...t.iter()], []);

  return useMemo(() => {
    if (playerEntity == null) {
      return [];
    }
    const carried = new Set(
      locationRows
        .filter((row) => row.locationEntityId === playerEntity)
        .map((row) => row.entityId),
    );
    // Sorted by ENTITY id: the counted-multiset rule reads "the first N
    // instances" off this order, and buttons render in it — raw table
    // iteration order can shift between updates, which would make a
    // click light up a DIFFERENT instance's button.
    return itemRows
      .filter((row) => carried.has(row.entityId))
      .sort((a, b) => (a.entityId < b.entityId ? -1 : 1))
      .map((row) => ({
        entityId: row.entityId,
        kind: row.itemRef.tag,
      }));
  }, [playerEntity, locationRows, itemRows]);
};

/** The worn armor ITEM entity, if any. */
export const useMyArmorEntityId = (): EntityId | null => {
  const playerEntity = usePlayerEntity();
  return useTableData(
    "armor_components",
    (t) => {
      if (playerEntity == null) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((t.entityId as any).find(playerEntity)?.armorEntityId ?? null) as
        | EntityId
        | null;
    },
    [playerEntity],
  );
};

/** The worn relic ITEM entities. */
export const useMyRelicEntityIds = (): EntityId[] => {
  const playerEntity = usePlayerEntity();
  return useTableData(
    "relics_components",
    (t) => {
      if (playerEntity == null) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (((t.entityId as any).find(playerEntity)?.relicEntityIds ??
        []) as EntityId[]).slice();
    },
    [playerEntity],
  );
};

/** The item ENTITIES actually equipped right now (the equipment cache's
 * source), across all kinds — as opposed to the configured assignments. */
export const useMyEquippedEntityIds = (): EntityId[] => {
  const playerEntity = usePlayerEntity();
  return useTableData(
    "equipment_components",
    (t) => {
      if (playerEntity == null) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (((t.entityId as any).find(playerEntity)?.equippedEntityIds ??
        []) as EntityId[]).slice();
    },
    [playerEntity],
  );
};

/** The equipped item ENTITIES whose stats are NOT currently applied — an
 * equipped item is TEMPORARILY disabled when applying it would drive a
 * capacity (hand/body/relic) negative against everything else, transient
 * status and the active stance included. Server-derived; present only while
 * something is unapplied. */
export const useMyDisabledEntityIds = (): EntityId[] => {
  const playerEntity = usePlayerEntity();
  return useTableData(
    "equipment_disabled_components",
    (t) => {
      if (playerEntity == null) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (((t.entityId as any).find(playerEntity)?.disabledEntityIds ??
        []) as EntityId[]).slice();
    },
    [playerEntity],
  );
};

/** The DEFAULT action bar (the equip menu's): what a stance change pins
 * when the adopted stance carries no bar assignment of its own. */
export const useMyDefaultActionIds = (): number[] => {
  const playerEntity = usePlayerEntity();
  return useTableData(
    "default_actions_components",
    (t) => {
      if (playerEntity == null) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (((t.entityId as any).find(playerEntity)?.actionIds ??
        []) as number[]).slice();
    },
    [playerEntity],
  );
};

/** The DEFAULT wielded set (the equip menu's): the item ENTITIES the hands
 * hold when the active stance assigns no override. */
export const useMyDefaultArmamentEntityIds = (): EntityId[] => {
  const playerEntity = usePlayerEntity();
  return useTableData(
    "default_armaments_components",
    (t) => {
      if (playerEntity == null) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (((t.entityId as any).find(playerEntity)?.armamentEntityIds ??
        []) as EntityId[]).slice();
    },
    [playerEntity],
  );
};

/** item ENTITY id -> the grouped block it contributes when equipped, read from
 * the item's OWN equippable component (no gear asset table). */
const useEquippableBlockMap = () =>
  useTableData(
    "equippable_components",
    (t) =>
      new Map<EntityId, GroupedBlock>(
        [...t.iter()].map((row) => [
          row.entityId,
          {
            stats: row.stats,
            bodyCapacity: row.bodyCapacity,
            readiness: row.readiness,
          },
        ]),
      ),
    [],
  );

/** Resolves any owned item to the grouped block it contributes when equipped —
 * read from the item entity's own Equippable. Quest items are not equippable
 * and resolve to null here. */
export const useGearStatBlockOf = (): ((
  item: OwnedItem,
) => GroupedBlock | null) => {
  const byEntity = useEquippableBlockMap();
  return useMemo(
    () => (item: OwnedItem) => byEntity.get(item.entityId) ?? null,
    [byEntity],
  );
};

export type StanceAssignment = {
  stanceId: number;
  /** INTENT IS EXPLICIT: null = no override (the stance fights with the
   * DEFAULT set); [] = deliberately bare hands; ids = the override item
   * ENTITIES. */
  armamentEntityIds: EntityId[] | null;
  /** null = no bar assignment (adoption leaves the bar alone); [] =
   * deliberately clear the bar; ids = the bar, in hotkey order. */
  actionIds: number[] | null;
};

export const useMyStanceAssignments = (): StanceAssignment[] => {
  const playerEntity = usePlayerEntity();
  return useTableData(
    "stance_customizations_components",
    (t) => {
      if (playerEntity == null) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = (t.entityId as any).find(playerEntity);
      type WireCustomization = {
        stanceId: number;
        armamentEntityIds?: EntityId[];
        actionIds?: number[];
      };
      return row == null
        ? []
        : (row.assignments as WireCustomization[]).map((a) => ({
            stanceId: a.stanceId,
            armamentEntityIds:
              a.armamentEntityIds == null ? null : [...a.armamentEntityIds],
            actionIds: a.actionIds == null ? null : [...a.actionIds],
          }));
    },
    [playerEntity],
  );
};
