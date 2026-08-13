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
  kind: GearKind;
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

  return useMemo(() => {
    if (playerEntity == null) {
      return [];
    }
    const carried = new Set(
      locationRows
        .filter((row) => row.locationEntityId === playerEntity)
        .map((row) => row.entityId),
    );
    return itemRows
      .filter((row) => carried.has(row.entityId))
      .map((row) => {
        const ref = row.itemRef;
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
  }, [playerEntity, locationRows, itemRows, armamentNames, armorNames, relicNames]);
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

// Instance-level toggling over counted asset ids: among the owned items of
// one asset, the first `count` render as on. Shared by every menu that
// proposes a counted-multiset of gear.
export const instanceIndex = (items: OwnedItem[], item: OwnedItem): number =>
  items
    .filter((other) => other.assetId === item.assetId)
    .findIndex((other) => other.entityId === item.entityId);

export const assetInstanceIsOn = ({
  ids,
  item,
  items,
}: {
  ids: number[];
  item: OwnedItem;
  items: OwnedItem[];
}): boolean =>
  instanceIndex(items, item) <
  ids.filter((id) => id === item.assetId).length;

export const toggledAssetIds = ({
  ids,
  item,
  items,
}: {
  ids: number[];
  item: OwnedItem;
  items: OwnedItem[];
}): number[] => {
  if (assetInstanceIsOn({ ids, item, items })) {
    const next = [...ids];
    next.splice(next.indexOf(item.assetId), 1);
    return next;
  }
  return [...ids, item.assetId];
};

export type StanceAssignment = { stanceId: number; armamentIds: number[] };

export const useMyStanceAssignments = (): StanceAssignment[] => {
  const playerEntity = usePlayerEntity();
  return useTableData(
    "stance_loadouts_components",
    (t) => {
      if (playerEntity == null) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = (t.entityId as any).find(playerEntity);
      return row == null
        ? []
        : (row.assignments as StanceAssignment[]).map((a) => ({
            stanceId: a.stanceId,
            armamentIds: [...a.armamentIds],
          }));
    },
    [playerEntity],
  );
};
