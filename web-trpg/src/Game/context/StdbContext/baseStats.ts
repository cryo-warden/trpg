import { useMemo } from "react";
import { useStanceDetailRows } from "./assetLookup";
import {
  useBodyCapacityTotal,
  useEquipmentBodyCapacityCache,
  useEquipmentReadinessCache,
  useEquipmentStatsCache,
  useMyActiveStanceId,
  usePlayerEntity,
  useReadinessTotal,
  useStatsTotal,
  useStatusReadinessCache,
  useStatusStatsCache,
} from "./components";
import {
  GroupedBlock,
  subtractBlock,
  ZERO_BODY_CAPACITY,
  ZERO_READINESS,
  ZERO_STATS,
} from "../../domain/statBlock";

/**
 * The STEADY per-group base of every stat: the published group totals with the
 * two mutable rungs peeled back off — the applied EQUIPMENT and STATUS caches —
 * and the active stance. What remains is baseline + traits + quest: steady,
 * configuration-INDEPENDENT, and status-free. The menus add a CONFIGURATION
 * (worn gear, wielded armaments, a stance) on top to render the HYPOTHETICAL
 * totals that configuration WOULD produce — updated the instant a selection
 * changes, never waiting for the actual equipment to converge on a later
 * action. One derivation, so the equip menu and the stance cards can never show
 * different bases. Body-capacity has no status contribution (status never
 * changes capacity), so it peels only equipment and stance. (The server
 * revalidates on every assignment; these numbers only inform.)
 */
export const useStanceFreeBase = (): { baseStats: GroupedBlock } => {
  const playerEntity = usePlayerEntity();
  const statsTotal = useStatsTotal(playerEntity);
  const readinessTotal = useReadinessTotal(playerEntity);
  const bodyCapacityTotal = useBodyCapacityTotal(playerEntity);
  const equipmentStats = useEquipmentStatsCache(playerEntity);
  const equipmentBodyCapacity = useEquipmentBodyCapacityCache(playerEntity);
  const equipmentReadiness = useEquipmentReadinessCache(playerEntity);
  const statusStats = useStatusStatsCache(playerEntity);
  const statusReadiness = useStatusReadinessCache(playerEntity);
  const activeStanceId = useMyActiveStanceId();
  const stanceRows = useStanceDetailRows();

  return useMemo(() => {
    const activeStance =
      stanceRows.find((row) => row.id === activeStanceId) ?? null;
    // total = baseline + traits + quest + equipment + status + active stance;
    // peel the mutable rungs and the stance per group to recover the steady
    // base. Body-capacity has no status rung.
    const stats = subtractBlock(
      subtractBlock(
        subtractBlock(statsTotal?.stats ?? ZERO_STATS, equipmentStats?.stats ?? ZERO_STATS),
        statusStats?.stats ?? ZERO_STATS,
      ),
      activeStance?.stats ?? ZERO_STATS,
    );
    const readiness = subtractBlock(
      subtractBlock(
        subtractBlock(
          readinessTotal?.readiness ?? ZERO_READINESS,
          equipmentReadiness?.readiness ?? ZERO_READINESS,
        ),
        statusReadiness?.readiness ?? ZERO_READINESS,
      ),
      activeStance?.readiness ?? ZERO_READINESS,
    );
    const bodyCapacity = subtractBlock(
      subtractBlock(
        bodyCapacityTotal?.bodyCapacity ?? ZERO_BODY_CAPACITY,
        equipmentBodyCapacity?.bodyCapacity ?? ZERO_BODY_CAPACITY,
      ),
      activeStance?.bodyCapacity ?? ZERO_BODY_CAPACITY,
    );
    return { baseStats: { stats, bodyCapacity, readiness } };
  }, [
    statsTotal,
    readinessTotal,
    bodyCapacityTotal,
    equipmentStats,
    equipmentBodyCapacity,
    equipmentReadiness,
    statusStats,
    statusReadiness,
    activeStanceId,
    stanceRows,
  ]);
};
