import { useMemo, useRef, useState } from "react";
import { Button } from "../structural/Button";
import "./StancesMenu.css";
import { ActionsBarEditor } from "./ActionsBarEditor";
import {
  useActionDisplayNameOf,
  useCommonPinnableActionIds,
  useStanceDetailRows,
  useStanceReachabilityGraph,
} from "./context/StdbContext/assetLookup";
import { useStanceFreeBase } from "./context/StdbContext/baseStats";
import {
  useMyActiveStanceId,
  usePlayerEntity,
  useTotalStatBlockComponent,
} from "./context/StdbContext/components";
import { assetInstanceIsOn, toggledAssetIds } from "./domain/countedAssets";
import {
  OwnedItem,
  useArmamentStatBlocks,
  useGearStatBlockOf,
  useMyDefaultActionIds,
  useMyDefaultArmamentIds,
  useMyStanceAssignments,
  useOwnedItems,
} from "./context/StdbContext/loadout";
import { useStdbConnection } from "./context/StdbContext/useStdb";
import { reachableStanceIds } from "./domain/stanceReachability";
import { signedStatSummary } from "./domain/statSummary";
import { ALL_STATS, IntStatKey } from "./statGroups";
import { StatBlockSummary } from "./StatBlockSummary";
import { StatGroupsView } from "./StatGroupsView";

/**
 * The standalone stances menu: one card per REACHABLE stance. There is no
 * "known stances" state anywhere — reachability (the closure from the
 * player's granted actions and carried items' grants) IS availability,
 * here and in the server's adoption gate. Cards snap-scroll horizontally,
 * each free to scroll vertically on its own. A card leads with the FULL
 * stat totals the player would have in that stance with its assigned
 * loadout, then assigns its armaments — the actions the stance will fight
 * with. Armament assignments to the ACTIVE stance equip and unequip
 * automatically (hands and configuration never disagree about the stance
 * you are in); other stances' assignments — and every ACTION assignment —
 * take effect when a stance change pays its round.
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
  const defaultArmamentIds = useMyDefaultArmamentIds();
  const defaultActionIds = useMyDefaultActionIds();
  const armamentStats = useArmamentStatBlocks();
  // Buttons render PROPER names, never the internal underscored key.
  const actionDisplayName = useActionDisplayNameOf();
  const commonPinnable = useCommonPinnableActionIds();

  const totalStatBlock = total?.statBlock ?? null;
  const reachable = useMemo(() => {
    const seedActionIds = [...(totalStatBlock?.actionIds ?? [])];
    for (const item of owned) {
      const gear = gearStatBlockOf(item);
      if (gear != null) {
        seedActionIds.push(...gear.actionIds);
      }
    }
    // The stance currently HELD is trivially reachable — even one adopted
    // by force or at creation, with no posture action granting it.
    const seedStanceIds = activeStanceId == null ? [] : [activeStanceId];
    return new Set(reachableStanceIds({ seedActionIds, seedStanceIds, graph }));
  }, [totalStatBlock, owned, gearStatBlockOf, graph, activeStanceId]);
  const shown = stanceRows.filter((row) => reachable.has(row.id));

  // The stance-free, armament-free base of every stat and grant — the
  // shared derivation the equip menu builds on too, so the two menus can
  // never show different bases. Each card shows the FULL TOTALS the
  // player would have in that stance with its assigned loadout.
  const { baseStats, baseActionIds } = useStanceFreeBase();
  const armamentStatSum = (armamentIds: number[], key: IntStatKey): number =>
    armamentIds.reduce(
      (sum, id) => sum + (armamentStats.get(id)?.[key] ?? 0),
      0,
    );

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
        const loadout = assignments.find((a) => a.stanceId === stance.id);
        // INTENT IS EXPLICIT in the loadout: null = no override / no bar
        // assignment; [] = deliberately bare hands / a deliberately blank
        // bar.
        const armamentOverride = loadout?.armamentIds ?? null;
        const barAssignment = loadout?.actionIds ?? null;
        const usesDefault = armamentOverride == null;
        const usesDefaultBar = barAssignment == null;
        const resolvedArmaments = armamentOverride ?? defaultArmamentIds;
        // The bar mirrors the armament rule: no assignment = the DEFAULT
        // action bar rides in.
        const assignedActions = barAssignment ?? defaultActionIds;
        const candidate = Object.fromEntries(
          ALL_STATS.map(([key]) => [
            key,
            baseStats[key] +
              stance.statBlock[key] +
              armamentStatSum(resolvedArmaments, key),
          ]),
        ) as Record<IntStatKey, number>;
        const freeHand = candidate.hand;
        const grantedActionNames = [...stance.statBlock.actionIds].map(
          (id) => actionDisplayName(id),
        );
        // The stance's candidate ACTION pool: base grants (the total minus
        // the active stance's and in-hand armaments' grants) plus this
        // stance's grants plus its assigned armaments' grants. Assigning
        // picks the pinned bar this stance carries in, in hotkey order.
        const poolActionIds = [
          ...new Set([
            ...baseActionIds,
            ...stance.statBlock.actionIds,
            ...resolvedArmaments.flatMap((id) => [
              ...(armamentStats.get(id)?.actionIds ?? []),
            ]),
            // The common verbs are always pinnable: their slot is the
            // point.
            ...commonPinnable,
          ]),
        ];
        // Highlighting always shows the EFFECTIVE set: the override when
        // one exists, the default items otherwise. Clicking an item while
        // on defaults copy-on-writes the visible set into a new override.
        const isOn = (item: OwnedItem) =>
          assetInstanceIsOn({
            ids: resolvedArmaments,
            item,
            items: ownedArmaments,
          });
        return (
          <section className="stanceCard" key={stance.id}>
            <h3>
              {stance.name}
              {stance.id === activeStanceId && " (active)"}
            </h3>
            {signedStatSummary(stance.statBlock) !== "" && (
              <div className="stanceSummary">
                <StatBlockSummary statBlock={stance.statBlock} />
              </div>
            )}
            <StatGroupsView
              statOf={(key) => candidate[key]}
              deltaOf={(key) => candidate[key] - baseStats[key]}
            />
            {grantedActionNames.length > 0 && (
              <div>Grants: {grantedActionNames.join(", ")}</div>
            )}
            <h4>Armaments (free hand: {freeHand})</h4>
            <Button
              className={usesDefault ? "active" : ""}
              interesting={usesDefault}
              onClick={() =>
                // A true toggle: on defaults, clicking moves to a CUSTOM
                // set with nothing assigned yet (Some([]) — deliberately
                // bare hands); on an override, clicking returns to the
                // default set (None).
                connection.reducers.assignStanceArmaments({
                  stanceId: stance.id,
                  armamentIds: usesDefault ? [] : undefined,
                })
              }
            >
              use default
            </Button>
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
                        ids: resolvedArmaments,
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
            <h4>Actions ({assignedActions.length}/10)</h4>
            <Button
              className={usesDefaultBar ? "active" : ""}
              interesting={usesDefaultBar}
              onClick={() =>
                // The same toggle the armaments have: on defaults,
                // clicking moves to a CUSTOM bar with nothing assigned
                // yet; on an override, clicking returns to the default
                // bar.
                connection.reducers.assignStanceActions({
                  stanceId: stance.id,
                  actionIds: usesDefaultBar ? [] : undefined,
                })
              }
            >
              use default
            </Button>
            <ActionsBarEditor
              assignedActionIds={assignedActions}
              nameOf={actionDisplayName}
              onAssign={(actionIds) =>
                // Editing while on defaults copy-on-writes the visible
                // bar into a new override, like the armament buttons.
                connection.reducers.assignStanceActions({
                  stanceId: stance.id,
                  actionIds,
                })
              }
            />
            {poolActionIds
              .filter((actionId) => !assignedActions.includes(actionId))
              .map((actionId) => (
                <Button
                  key={actionId}
                  disabled={assignedActions.length >= 10}
                  onClick={() =>
                    connection.reducers.assignStanceActions({
                      stanceId: stance.id,
                      actionIds: [...assignedActions, actionId],
                    })
                  }
                >
                  {actionDisplayName(actionId)}
                </Button>
              ))}
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
