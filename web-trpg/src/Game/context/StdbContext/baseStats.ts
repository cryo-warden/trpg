import { useMemo } from "react";
import { ALL_STATS, IntStatKey } from "../../statGroups";
import { useStanceDetailRows } from "./assetLookup";
import {
  useMyActiveStanceId,
  usePlayerEntity,
  useTotalStatBlockComponent,
} from "./components";
import {
  useGearStatBlockOf,
  useMyEquippedEntityIds,
  useOwnedItems,
} from "./customization";

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
  const equippedEntityIds = useMyEquippedEntityIds();
  const owned = useOwnedItems();
  const gearStatBlockOf = useGearStatBlockOf();

  return useMemo(() => {
    const totalStatBlock = total?.statBlock ?? null;
    const activeStanceBlock =
      stanceRows.find((row) => row.id === activeStanceId)?.statBlock ?? null;
    const ownedByEntityId = new Map(owned.map((item) => [item.entityId, item]));
    // Only ARMAMENTS vary per stance, so only their in-hand contribution is
    // peeled off; worn armor and relics stay part of the base.
    const inHandArmaments = equippedEntityIds
      .map((id) => ownedByEntityId.get(id))
      .filter((item) => item != null && item.kind === "Armament")
      .map((item) => gearStatBlockOf(item!))
      .filter((block) => block != null);
    const armamentStatSum = (key: IntStatKey): number =>
      inHandArmaments.reduce((sum, block) => sum + (block![key] ?? 0), 0);
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
    for (const block of inHandArmaments) {
      for (const id of block!.actionIds ?? []) {
        ids.delete(id);
      }
    }
    return { baseStats, baseActionIds: [...ids] };
  }, [total, stanceRows, activeStanceId, equippedEntityIds, owned, gearStatBlockOf]);
};
