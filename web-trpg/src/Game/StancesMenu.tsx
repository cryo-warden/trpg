import { useMemo } from "react";
import { Button } from "../structural/Button";
import "./StancesMenu.css";
import {
  useStanceDetailRows,
  useStanceReachabilityGraph,
} from "./context/StdbContext/assetLookup";
import {
  useMyActiveStanceId,
  usePlayerEntity,
  useTotalStatBlockComponent,
} from "./context/StdbContext/components";
import {
  assetInstanceIsOn,
  OwnedItem,
  toggledAssetIds,
  useArmamentStatBlocks,
  useGearStatBlockOf,
  useMyEquipmentArmamentIds,
  useMyStanceAssignments,
  useOwnedItems,
} from "./context/StdbContext/loadout";
import { useStdbConnection } from "./context/StdbContext/useStdb";
import { useTableData } from "./context/StdbContext/useTableData";
import { reachableStanceIds } from "./domain/stanceReachability";

const STAT_DISPLAY = [
  ["attack", "Attack"],
  ["defense", "Defense"],
  ["mhp", "Max HP"],
  ["mep", "Max EP"],
  ["hand", "Hand"],
  ["gait", "Gait"],
  ["reach", "Reach"],
  ["blunt", "Blunt"],
  ["bladed", "Bladed"],
  ["pole", "Pole"],
  ["ward", "Ward"],
  ["focus", "Focus"],
  ["wing", "Wing"],
  ["size", "Size"],
  ["morale", "Morale"],
] as const;

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/**
 * The standalone stances menu: one card per REACHABLE stance. There is no
 * "known stances" state anywhere — reachability (the closure from the
 * player's granted actions and carried items' grants) IS availability,
 * here and in the server's adoption gate. Cards snap-scroll horizontally,
 * each free to scroll vertically on its own. A card shows the stats the
 * stance would grant and assigns its armaments — the actions the stance
 * will fight with. Assignments are CONFIGURATION and apply immediately;
 * the actual equipment only changes when a stance change pays its round.
 */
export const StancesMenu = () => {
  const connection = useStdbConnection();
  const playerEntity = usePlayerEntity();
  const total = useTotalStatBlockComponent(playerEntity);
  const activeStanceId = useMyActiveStanceId();
  const stanceRows = useStanceDetailRows();
  const graph = useStanceReachabilityGraph();
  const assignments = useMyStanceAssignments();
  const owned = useOwnedItems();
  const gearStatBlockOf = useGearStatBlockOf();
  const equippedArmamentIds = useMyEquipmentArmamentIds();
  const armamentStats = useArmamentStatBlocks();
  const actionNames = useTableData(
    "actions",
    (table) =>
      new Map<number, string>([...table.iter()].map((row) => [row.id, row.name])),
    [],
  );

  const totalStatBlock = total?.statBlock ?? null;
  const reachable = useMemo(() => {
    const seedActionIds = [...(totalStatBlock?.actionIds ?? [])];
    for (const item of owned) {
      const gear = gearStatBlockOf(item);
      if (gear != null) {
        seedActionIds.push(...gear.actionIds);
      }
    }
    return new Set(
      reachableStanceIds({ seedActionIds, seedStanceIds: [], graph }),
    );
  }, [totalStatBlock, owned, gearStatBlockOf, graph]);
  const shown = stanceRows.filter((row) => reachable.has(row.id));

  // The stance-free, armament-free grip: the total includes the active
  // stance and the equipment actually in hand, so peel both back off. (The
  // server revalidates against the true base on every assignment; this
  // budget only decides which buttons are worth offering.)
  const activeStanceHand =
    stanceRows.find((row) => row.id === activeStanceId)?.statBlock.hand ?? 0;
  const equippedHand = equippedArmamentIds.reduce(
    (sum, id) => sum + (armamentStats.get(id)?.hand ?? 0),
    0,
  );
  const baseHand = (totalStatBlock?.hand ?? 0) - activeStanceHand - equippedHand;

  const ownedArmaments = owned.filter((item) => item.kind === "Armament");

  return (
    <div className="StancesMenu">
      {shown.map((stance) => {
        const assigned =
          assignments.find((a) => a.stanceId === stance.id)?.armamentIds ?? [];
        const assignedHand = assigned.reduce(
          (sum, id) => sum + (armamentStats.get(id)?.hand ?? 0),
          0,
        );
        const freeHand = baseHand + stance.statBlock.hand + assignedHand;
        const grants = STAT_DISPLAY.filter(
          ([key]) => stance.statBlock[key] !== 0,
        );
        const grantedActionNames = [...stance.statBlock.actionIds].map(
          (id) => actionNames.get(id) ?? `#${id}`,
        );
        const isOn = (item: OwnedItem) =>
          assetInstanceIsOn({ ids: assigned, item, items: ownedArmaments });
        return (
          <section className="stanceCard" key={stance.id}>
            <h3>
              {stance.name}
              {stance.id === activeStanceId && " (active)"}
            </h3>
            <div className="grants">
              {grants.map(([key, label]) => (
                <div key={key}>
                  {label} {signed(stance.statBlock[key])}
                </div>
              ))}
              {grantedActionNames.length > 0 && (
                <div>Grants: {grantedActionNames.join(", ")}</div>
              )}
              {grants.length === 0 && grantedActionNames.length === 0 && (
                <div>No changes — pure improvisation.</div>
              )}
            </div>
            <h4>Armaments (free hand: {freeHand})</h4>
            {ownedArmaments.map((item) => {
              const itemHand = armamentStats.get(item.assetId)?.hand ?? 0;
              const on = isOn(item);
              return (
                <Button
                  key={item.entityId.toString()}
                  className={on ? "active" : ""}
                  disabled={!on && freeHand + itemHand < 0}
                  onClick={() =>
                    connection.reducers.assignStanceArmaments({
                      stanceId: stance.id,
                      armamentIds: toggledAssetIds({
                        ids: assigned,
                        item,
                        items: ownedArmaments,
                      }),
                    })
                  }
                >
                  {item.name}
                </Button>
              );
            })}
            {ownedArmaments.length === 0 && <div>Nothing carried to wield.</div>}
          </section>
        );
      })}
    </div>
  );
};
