import { useMemo } from "react";
import { StatBlock } from "../../../stdb/types";
import { useStanceDetailRows } from "./assetLookup";
import {
  useEquipmentStatBlockCache,
  useMyActiveStanceId,
  usePlayerEntity,
  useStatusStatBlockCache,
  useTotalStatBlockComponent,
} from "./components";
import { subtractStatBlocks, ZERO_STAT_BLOCK } from "../../domain/statBlock";

/**
 * The STEADY base of every stat and action grant: the published total with the
 * two mutable rungs peeled back off — the applied EQUIPMENT and STATUS caches —
 * and the active stance. What remains is baseline + traits + quest: steady,
 * configuration-INDEPENDENT, and status-free. The menus add a CONFIGURATION
 * (worn gear, wielded armaments, a stance) on top to render the HYPOTHETICAL
 * totals that configuration WOULD produce — updated the instant a selection
 * changes, never waiting for the actual equipment to converge on a later
 * action. One derivation, so the equip menu and the stance cards can never show
 * different bases. (The server revalidates on every assignment; these numbers
 * only inform.)
 */
export const useStanceFreeBase = (): {
  baseStats: StatBlock;
  baseActionIds: number[];
} => {
  const playerEntity = usePlayerEntity();
  const total = useTotalStatBlockComponent(playerEntity);
  const equipmentCache = useEquipmentStatBlockCache(playerEntity);
  const statusCache = useStatusStatBlockCache(playerEntity);
  const activeStanceId = useMyActiveStanceId();
  const stanceRows = useStanceDetailRows();

  return useMemo(() => {
    const totalStatBlock = total?.statBlock ?? ZERO_STAT_BLOCK;
    const equipmentBlock = equipmentCache?.statBlock ?? ZERO_STAT_BLOCK;
    const statusBlock = statusCache?.statBlock ?? ZERO_STAT_BLOCK;
    const activeStanceBlock =
      stanceRows.find((row) => row.id === activeStanceId)?.statBlock ??
      ZERO_STAT_BLOCK;
    // total = baseline + traits + equipment + status + quest + active stance;
    // peel the mutable rungs and the stance to recover baseline + traits +
    // quest — the steady base every menu builds its own configuration onto.
    const base = subtractStatBlocks(
      subtractStatBlocks(
        subtractStatBlocks(totalStatBlock, equipmentBlock),
        statusBlock,
      ),
      activeStanceBlock,
    );
    return { baseStats: base, baseActionIds: base.actionIds };
  }, [total, equipmentCache, statusCache, activeStanceId, stanceRows]);
};
