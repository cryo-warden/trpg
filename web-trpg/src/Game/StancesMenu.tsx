import { useMemo, useRef, useState } from "react";
import { Button } from "../structural/Button";
import "./StancesMenu.css";
import { EntityId } from "./trpg";
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
import { STANCE_DISPLAY_NAMES } from "./assets/stances";
import { displayNameFrom } from "./assets/display_names";
import {
  OwnedItem,
  useGearStatBlockOf,
  useMyDefaultActionIds,
  useMyDefaultArmamentEntityIds,
  useMyStanceAssignments,
  useOwnedItems,
} from "./context/StdbContext/customization";
import { useStdbConnection } from "./context/StdbContext/useStdb";
import { reachableStanceIds } from "./domain/stanceReachability";
import { signedStatSummary } from "./domain/statSummary";
import { ALL_STATS, IntStatKey } from "./statGroups";
import { StatBlockSummary } from "./StatBlockSummary";
import { StatGroupsView } from "./StatGroupsView";

/** Toggle one item ENTITY in a set — membership is the whole rule. */
const toggle = (ids: readonly EntityId[], id: EntityId): EntityId[] =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];

/**
 * The standalone stances menu: one card per REACHABLE stance. There is no
 * "known stances" state anywhere — reachability (the closure from the
 * player's granted actions and carried items' grants) IS availability,
 * here and in the server's adoption gate. Cards snap-scroll horizontally,
 * each free to scroll vertically on its own. A card leads with the FULL
 * stat totals the player would have in that stance with its assigned
 * customization, then assigns its armaments — each button one owned item
 * ENTITY. Armament assignments to the ACTIVE stance equip and unequip
 * automatically; other stances' assignments — and every ACTION assignment
 * — take effect when a stance change pays its round.
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
  const defaultArmamentEntityIds = useMyDefaultArmamentEntityIds();
  const defaultActionIds = useMyDefaultActionIds();
  // Buttons render PROPER names, never the internal underscored key.
  const actionDisplayName = useActionDisplayNameOf();
  const commonPinnable = useCommonPinnableActionIds();

  const ownedByEntityId = useMemo(
    () => new Map(owned.map((item) => [item.entityId, item])),
    [owned],
  );
  const statOfEntityId = (id: EntityId) => {
    const item = ownedByEntityId.get(id);
    return item == null ? null : gearStatBlockOf(item);
  };

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
  // player would have in that stance with its assigned customization.
  const { baseStats, baseActionIds } = useStanceFreeBase();
  const armamentStatSum = (
    armamentEntityIds: readonly EntityId[],
    key: IntStatKey,
  ): number =>
    armamentEntityIds.reduce(
      (sum, id) => sum + (statOfEntityId(id)?.[key] ?? 0),
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
        const customization = assignments.find((a) => a.stanceId === stance.id);
        // INTENT IS EXPLICIT in the customization: null = no override / no bar
        // assignment; [] = deliberately bare hands / a deliberately blank
        // bar.
        const armamentOverride = customization?.armamentEntityIds ?? null;
        const barAssignment = customization?.actionIds ?? null;
        const usesDefault = armamentOverride == null;
        const usesDefaultBar = barAssignment == null;
        const resolvedArmaments = armamentOverride ?? defaultArmamentEntityIds;
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
        // The stance's candidate ACTION set: base grants (the total minus
        // the active stance's and in-hand armaments' grants) plus this
        // stance's grants plus its assigned armaments' grants. Assigning
        // picks the pinned bar this stance carries in, in hotkey order.
        const candidateActionIds = [
          ...new Set([
            ...baseActionIds,
            ...stance.statBlock.actionIds,
            ...resolvedArmaments.flatMap((id) => [
              ...(statOfEntityId(id)?.actionIds ?? []),
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
          resolvedArmaments.includes(item.entityId);
        const stanceName = displayNameFrom(STANCE_DISPLAY_NAMES, stance.name);
        return (
          <section className="stanceCard" key={stance.id}>
            <h3>
              {stanceName}
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
                  armamentEntityIds: usesDefault ? [] : undefined,
                })
              }
            >
              use default
            </Button>
            {ownedArmaments.map((item) => {
              const on = isOn(item);
              return (
                <Button
                  key={item.entityId.toString()}
                  className={on ? "active" : ""}
                  interesting={on}
                  onClick={() =>
                    connection.reducers.assignStanceArmaments({
                      stanceId: stance.id,
                      armamentEntityIds: toggle(resolvedArmaments, item.entityId),
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
            {candidateActionIds
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
            aria-label={displayNameFrom(STANCE_DISPLAY_NAMES, stance.name)}
            title={displayNameFrom(STANCE_DISPLAY_NAMES, stance.name)}
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
