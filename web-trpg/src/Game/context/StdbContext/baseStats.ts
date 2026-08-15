import { useMemo } from "react";
import { ALL_STATS, IntStatKey } from "../../statGroups";
import { useStanceDetailRows } from "./assetLookup";
import {
  useMyActiveStanceId,
  usePlayerEntity,
  useTotalStatBlockComponent,
} from "./components";
import {
  useArmamentStatBlocks,
  useMyEquipmentArmamentIds,
} from "./loadout";

/**
 * The stance-free, armament-free BASE of every stat and action grant:
 * the published total with the active stance's and the in-hand
 * armaments' contributions peeled back off. THE base every stance card
 * compares against, and the base the equip menu builds its default
 * configuration on — one derivation, so the two menus can never show
 * different bases. (The server revalidates against the true base on
 * every assignment; these numbers only inform.)
 */
export const useStanceFreeBase = (): {
  baseStats: Record<IntStatKey, number>;
  baseActionIds: number[];
} => {
  const playerEntity = usePlayerEntity();
  const total = useTotalStatBlockComponent(playerEntity);
  const activeStanceId = useMyActiveStanceId();
  const stanceRows = useStanceDetailRows();
  const equippedArmamentIds = useMyEquipmentArmamentIds();
  const armamentStats = useArmamentStatBlocks();

  return useMemo(() => {
    const totalStatBlock = total?.statBlock ?? null;
    const activeStanceBlock =
      stanceRows.find((row) => row.id === activeStanceId)?.statBlock ?? null;
    const armamentStatSum = (key: IntStatKey): number =>
      equippedArmamentIds.reduce(
        (sum, id) => sum + (armamentStats.get(id)?.[key] ?? 0),
        0,
      );
    const baseStats = Object.fromEntries(
      ALL_STATS.map(([key]) => [
        key,
        (totalStatBlock?.[key] ?? 0) -
          (activeStanceBlock?.[key] ?? 0) -
          armamentStatSum(key),
      ]),
    ) as Record<IntStatKey, number>;

    const ids = new Set(totalStatBlock?.actionIds ?? []);
    for (const id of activeStanceBlock?.actionIds ?? []) {
      ids.delete(id);
    }
    for (const armamentId of equippedArmamentIds) {
      for (const id of armamentStats.get(armamentId)?.actionIds ?? []) {
        ids.delete(id);
      }
    }
    return { baseStats, baseActionIds: [...ids] };
  }, [total, stanceRows, activeStanceId, equippedArmamentIds, armamentStats]);
};
