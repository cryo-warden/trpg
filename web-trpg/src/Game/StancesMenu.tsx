import { useMemo, useRef, useState } from "react";
import type { StatBlock } from "../stdb/types";
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

/** Every int stat of the block (the id-vec grants are not numbers). */
type IntStatKey = Exclude<keyof StatBlock, "actionIds" | "appearanceFeatureIds">;

type StatEntry = readonly [IntStatKey, string];

type StatGroup = { label: string; stats: readonly StatEntry[] };

const STAT_GROUPS: readonly StatGroup[] = [
  {
    label: "Combat",
    stats: [
      ["attack", "Attack"],
      ["defense", "Defense"],
      ["morale", "Morale"],
    ],
  },
  {
    label: "Pools",
    stats: [
      ["mhp", "Max HP"],
      ["mep", "Max EP"],
    ],
  },
  {
    label: "Body",
    stats: [
      ["hand", "Hand"],
      ["gait", "Gait"],
      ["reach", "Reach"],
      ["wing", "Wing"],
      ["upright", "Upright"],
      ["size", "Size"],
    ],
  },
  {
    label: "Armament",
    stats: [
      ["blunt", "Blunt"],
      ["bladed", "Bladed"],
      ["pole", "Pole"],
      ["ward", "Ward"],
      ["focus", "Focus"],
    ],
  },
];

const ALL_STATS: readonly StatEntry[] = STAT_GROUPS.flatMap(
  (group) => group.stats,
);

/** The parenthesized delta against the no-stance value: always shown, so
 * like-for-like reads at a glance ("Hand 1 (-1)"). */
const deltaText = (delta: number): string =>
  delta > 0 ? `+${delta}` : `${delta}`;

/**
 * The standalone stances menu: one card per REACHABLE stance. There is no
 * "known stances" state anywhere — reachability (the closure from the
 * player's granted actions and carried items' grants) IS availability,
 * here and in the server's adoption gate. Cards snap-scroll horizontally,
 * each free to scroll vertically on its own. A card leads with the FULL
 * stat totals the player would have in that stance with its assigned
 * loadout, then assigns its armaments — the actions the stance will fight
 * with. Assignments are CONFIGURATION and apply immediately; the actual
 * equipment only changes when a stance change pays its round.
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
    // The stance currently HELD is trivially reachable — its own posture
    // is same-stance-filtered out of the derived actions, so without this
    // seed the active stance's card would vanish from its own menu.
    const seedStanceIds = activeStanceId == null ? [] : [activeStanceId];
    return new Set(reachableStanceIds({ seedActionIds, seedStanceIds, graph }));
  }, [totalStatBlock, owned, gearStatBlockOf, graph, activeStanceId]);
  const shown = stanceRows.filter((row) => reachable.has(row.id));

  // The stance-free, armament-free base of EVERY stat: the total includes
  // the active stance and the equipment actually in hand, so peel both
  // back off. Each card then shows the FULL TOTALS the player would have
  // in that stance with its assigned loadout. (The server revalidates
  // against the true base on every assignment; these numbers only inform.)
  const activeStanceBlock =
    stanceRows.find((row) => row.id === activeStanceId)?.statBlock ?? null;
  const armamentStatSum = (armamentIds: number[], key: IntStatKey): number =>
    armamentIds.reduce(
      (sum, id) => sum + (armamentStats.get(id)?.[key] ?? 0),
      0,
    );
  const baseStats = Object.fromEntries(
    ALL_STATS.map(([key]) => [
      key,
      (totalStatBlock?.[key] ?? 0) -
        (activeStanceBlock?.[key] ?? 0) -
        armamentStatSum(equippedArmamentIds, key),
    ]),
  ) as Record<IntStatKey, number>;

  const ownedArmaments = owned.filter((item) => item.kind === "Armament");

  // Gallery indicators: one dot per card; the leading (snapped) card is
  // the current one. Cards are narrower than the strip on wide screens,
  // so several show at once — the dots track the strip's leading edge.
  const cardsRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardElements = (): HTMLElement[] =>
    cardsRef.current == null
      ? []
      : ([...cardsRef.current.querySelectorAll(".stanceCard")] as HTMLElement[]);
  const handleScroll = () => {
    const strip = cardsRef.current;
    if (strip == null) {
      return;
    }
    let nearest = 0;
    let nearestDistance = Infinity;
    cardElements().forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - strip.scrollLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });
    setCurrentIndex(nearest);
  };
  const scrollToIndex = (index: number) => {
    const strip = cardsRef.current;
    const card = cardElements()[index];
    if (strip == null || card == null) {
      return;
    }
    strip.scrollTo?.({ left: card.offsetLeft, behavior: "smooth" });
  };

  return (
    <div className="StancesMenu">
      <div className="cards" ref={cardsRef} onScroll={handleScroll}>
        {shown.map((stance) => {
        const assigned =
          assignments.find((a) => a.stanceId === stance.id)?.armamentIds ?? [];
        const candidate = Object.fromEntries(
          ALL_STATS.map(([key]) => [
            key,
            baseStats[key] +
              stance.statBlock[key] +
              armamentStatSum(assigned, key),
          ]),
        ) as Record<IntStatKey, number>;
        const freeHand = candidate.hand;
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
            {STAT_GROUPS.map((group) => (
              <div className="statGroup" key={group.label}>
                <h4>{group.label}</h4>
                <div className="totals">
                  {group.stats.map(([key, label]) => (
                    <div key={key}>
                      {label} {candidate[key]} (
                      {deltaText(candidate[key] - baseStats[key])})
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {grantedActionNames.length > 0 && (
              <div>Grants: {grantedActionNames.join(", ")}</div>
            )}
            <h4>Armaments (free hand: {freeHand})</h4>
            {ownedArmaments.map((item) => {
              const itemHand = armamentStats.get(item.assetId)?.hand ?? 0;
              const on = isOn(item);
              return (
                <Button
                  key={item.entityId.toString()}
                  className={on ? "active" : ""}
                  interesting={on}
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
      <div className="dots">
        {shown.map((stance, index) => (
          <button
            key={stance.id}
            type="button"
            aria-label={stance.name}
            title={stance.name}
            className={[
              index === currentIndex ? "current" : "",
              stance.id === activeStanceId ? "activeStance" : "",
            ].join(" ")}
            onClick={() => scrollToIndex(index)}
          />
        ))}
      </div>
    </div>
  );
};
