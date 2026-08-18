import { useMemo } from "react";
import { StatBlock } from "../../../stdb/types";
import { EntityId } from "../../trpg";
import { ARMAMENT_DISPLAY_NAMES } from "../../assets/armaments";
import { ARMOR_DISPLAY_NAMES } from "../../assets/armors";
import { RELIC_DISPLAY_NAMES } from "../../assets/relics";
import { QUEST_DISPLAY_NAMES } from "../../assets/quests";
import { displayNameFrom } from "../../assets/display_names";
import { usePlayerEntity } from "./components";
import { useTableData } from "./useTableData";

// The gear asset tables are public precisely so the customization menu can turn
// the ids found in item components back into names — the backward half of
// the name/id asymmetry, same as actions.
export const gearQueries = [
  "select * from armaments",
  "select * from armors",
  "select * from relics",
];

export type GearKind = "Armament" | "Armor" | "Relic";

export type OwnedItem = {
  entityId: EntityId;
  kind: GearKind | "QuestItem";
  /** Gear asset id — or the QUEST id for quest items (their instance
   * identity is the quest bit, not a gear asset). */
  assetId: number;
  /** The PROPER display name (raw key resolved through the client
   * vocabulary), never the internal underscored key. */
  name: string;
};

/** id -> display name for a gear kind: the subscribed table hands back the
 * raw key from an id, the kind's vocabulary turns it human. */
const useNameMap = (
  table: "armaments" | "armors" | "relics",
  vocabulary: Record<string, string>,
) =>
  useTableData(
    table,
    (t) =>
      new Map<number, string>(
        [...t.iter()].map((row) => [
          row.id,
          displayNameFrom(vocabulary, row.name),
        ]),
      ),
    [vocabulary],
  );

/** Everything the player carries (carrying IS location), resolved to gear
 * names for display. */
export const useOwnedItems = (): OwnedItem[] => {
  const playerEntity = usePlayerEntity();
  const locationRows = useTableData(
    "location_components",
    (t) => [...t.iter()],
    [],
  );
  const itemRows = useTableData("item_components", (t) => [...t.iter()], []);
  const armamentNames = useNameMap("armaments", ARMAMENT_DISPLAY_NAMES);
  const armorNames = useNameMap("armors", ARMOR_DISPLAY_NAMES);
  const relicNames = useNameMap("relics", RELIC_DISPLAY_NAMES);
  const questNames = useTableData(
    "quests",
    (t) =>
      new Map<number, string>(
        [...t.iter()].map((row) => [
          row.id,
          displayNameFrom(QUEST_DISPLAY_NAMES, row.name),
        ]),
      ),
    [],
  );

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
      .map((row) => {
        const ref = row.itemRef;
        if (ref.tag === "QuestItem") {
          const questId = ref.value.questId;
          return {
            entityId: row.entityId,
            kind: "QuestItem" as const,
            assetId: questId,
            name: questNames.get(questId) ?? `#${questId}`,
          };
        }
        const names =
          ref.tag === "Armament"
            ? armamentNames
            : ref.tag === "Armor"
              ? armorNames
              : relicNames;
        return {
          entityId: row.entityId,
          kind: ref.tag,
          assetId: ref.value,
          name: names.get(ref.value) ?? `#${ref.value}`,
        };
      });
  }, [
    playerEntity,
    locationRows,
    itemRows,
    armamentNames,
    armorNames,
    relicNames,
    questNames,
  ]);
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

const useStatBlockMap = (table: "armaments" | "armors" | "relics") =>
  useTableData(
    table,
    (t) =>
      new Map<number, StatBlock>(
        [...t.iter()].map((row) => [row.id, row.statBlock]),
      ),
    [],
  );

/** Resolves any owned item to its gear asset's stat block. */
export const useGearStatBlockOf = (): ((
  item: OwnedItem,
) => StatBlock | null) => {
  const armamentStats = useStatBlockMap("armaments");
  const armorStats = useStatBlockMap("armors");
  const relicStats = useStatBlockMap("relics");
  return useMemo(
    () => (item: OwnedItem) =>
      (item.kind === "Armament"
        ? armamentStats
        : item.kind === "Armor"
          ? armorStats
          : relicStats
      ).get(item.assetId) ?? null,
    [armamentStats, armorStats, relicStats],
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
