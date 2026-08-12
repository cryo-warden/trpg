import { useMemo } from "react";
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
