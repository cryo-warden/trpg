import { useMemo } from "react";
import { StatBlock } from "../../../stdb/types";
import { EntityId } from "../../trpg";
import { usePlayerEntity } from "./components";
import { useTableData } from "./useTableData";

// The gear asset tables are public precisely so the loadout menu can turn
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
  name: string;
};

const useNameMap = (table: "armaments" | "armors" | "relics") =>
  useTableData(
    table,
    (t) => new Map<number, string>([...t.iter()].map((row) => [row.id, row.name])),
    [],
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
  const armamentNames = useNameMap("armaments");
  const armorNames = useNameMap("armors");
  const relicNames = useNameMap("relics");
  const questNames = useTableData(
    "quests",
    (t) => new Map<number, string>([...t.iter()].map((row) => [row.id, row.name])),
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

export const useMyArmorId = (): number | null => {
  const playerEntity = usePlayerEntity();
  return useTableData(
    "armor_components",
    (t) => {
      if (playerEntity == null) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((t.entityId as any).find(playerEntity)?.armorId ?? null) as
        | number
        | null;
    },
    [playerEntity],
  );
};

export const useMyRelicIds = (): number[] => {
  const playerEntity = usePlayerEntity();
  return useTableData(
    "relics_components",
    (t) => {
      if (playerEntity == null) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (((t.entityId as any).find(playerEntity)?.relicIds ?? []) as number[]).slice();
    },
    [playerEntity],
  );
};

/** The armaments ACTUALLY in hand right now (the equipment cache), as
 * opposed to the configured loadout assignments. */
export const useMyEquipmentArmamentIds = (): number[] => {
  const playerEntity = usePlayerEntity();
  return useTableData(
    "equipment_components",
    (t) => {
      if (playerEntity == null) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (((t.entityId as any).find(playerEntity)?.armamentIds ??
        []) as number[]).slice();
    },
    [playerEntity],
  );
};

/** The DEFAULT wielded set (the equip menu's): what the hands hold when
 * the active stance assigns no override. */
export const useMyDefaultArmamentIds = (): number[] => {
  const playerEntity = usePlayerEntity();
  return useTableData(
    "default_armaments_components",
    (t) => {
      if (playerEntity == null) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (((t.entityId as any).find(playerEntity)?.armamentIds ??
        []) as number[]).slice();
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

export const useArmamentStatBlocks = (): Map<number, StatBlock> =>
  useStatBlockMap("armaments");

/** All three gear kinds' asset stat blocks, for surfaces summing a worn
 * set (the loadout menu's equipped-contribution line). */
export const useGearStatBlocks = (): {
  armaments: Map<number, StatBlock>;
  armors: Map<number, StatBlock>;
  relics: Map<number, StatBlock>;
} => {
  const armaments = useStatBlockMap("armaments");
  const armors = useStatBlockMap("armors");
  const relics = useStatBlockMap("relics");
  return useMemo(
    () => ({ armaments, armors, relics }),
    [armaments, armors, relics],
  );
};

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
   * DEFAULT set); [] = deliberately bare hands; ids = the override. */
  armamentIds: number[] | null;
  /** null = no bar assignment (adoption leaves the bar alone); [] =
   * deliberately clear the bar; ids = the bar, in hotkey order. */
  actionIds: number[] | null;
};

export const useMyStanceAssignments = (): StanceAssignment[] => {
  const playerEntity = usePlayerEntity();
  return useTableData(
    "stance_loadouts_components",
    (t) => {
      if (playerEntity == null) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = (t.entityId as any).find(playerEntity);
      type WireLoadout = {
        stanceId: number;
        armamentIds?: number[];
        actionIds?: number[];
      };
      return row == null
        ? []
        : (row.assignments as WireLoadout[]).map((a) => ({
            stanceId: a.stanceId,
            armamentIds: a.armamentIds == null ? null : [...a.armamentIds],
            actionIds: a.actionIds == null ? null : [...a.actionIds],
          }));
    },
    [playerEntity],
  );
};
