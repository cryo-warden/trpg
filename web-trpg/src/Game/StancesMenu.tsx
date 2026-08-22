import { useMemo, useRef, useState } from "react";
import { Button } from "../structural/Button";
import "./StancesMenu.css";
import { EntityId } from "./trpg";
import { ActionsBarEditor } from "./ActionsBarEditor";
import {
  useActionDisplayNameOf,
  useActionsMeetingReadiness,
  useCommonPinnableActionIds,
  useStanceDetailRows,
} from "./context/StdbContext/assetLookup";
import { useStanceFreeBase } from "./context/StdbContext/baseStats";
import { useMyActiveStanceId } from "./context/StdbContext/components";
import { STANCE_DISPLAY_NAMES } from "./assets/stances";
import { displayNameFrom } from "./assets/display_names";
import {
  OwnedItem,
  useGearStatBlockOf,
  useMyArmorEntityId,
  useMyDefaultActionIds,
  useMyDefaultArmamentEntityIds,
  useMyDisabledEntityIds,
  useMyRelicEntityIds,
  useMyStanceAssignments,
  useOwnedItems,
} from "./context/StdbContext/customization";
import { useStdbConnection } from "./context/StdbContext/useStdb";
import { reachableStanceIds } from "./domain/stanceReachability";
import { signedStatSummary } from "./domain/statSummary";
import {
  addBlock,
  addGrouped,
  applyEquipmentIfFits,
  EquipCandidate,
  flattenGrouped,
  GroupedBlock,
  ZERO_READINESS,
} from "./domain/statBlock";
import { EntityName } from "./EntityName";
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
 * HYPOTHETICAL totals the player WOULD have in that stance with its assigned
 * customization — computed from the configuration, so they update the instant
 * a selection changes, never waiting for the actual equipment to converge on a
 * later action. Then it assigns its armaments — each button one owned item
 * ENTITY, named by its own appearance. Armament assignments to the ACTIVE
 * stance equip and unequip automatically; other stances' assignments — and
 * every ACTION assignment — take effect when a stance change pays its round.
 */
export const StancesMenu = () => {
  const connection = useStdbConnection();
  const activeStanceId = useMyActiveStanceId();
  const stanceRows = useStanceDetailRows();
  const assignments = useMyStanceAssignments();
  const owned = useOwnedItems();
  const gearStatBlockOf = useGearStatBlockOf();
  const armorEntityId = useMyArmorEntityId();
  const relicEntityIds = useMyRelicEntityIds();
  const defaultArmamentEntityIds = useMyDefaultArmamentEntityIds();
  const defaultActionIds = useMyDefaultActionIds();
  // Equipped-but-unapplied armaments (a capacity ran out under the LIVE
  // status/stance): marked temporarily disabled on the active stance's card.
  const disabled = new Set(useMyDisabledEntityIds());
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
  const candidatesOf = (ids: readonly EntityId[]): EquipCandidate[] =>
    ids.flatMap((id) => {
      const block = statOfEntityId(id);
      return block == null ? [] : [{ entityId: id, block }];
    });

  // The stance-free, armament-free base of every stat and grant — steady
  // (baseline + traits + quest), status-free, and shared with the equip menu.
  const { baseStats } = useStanceFreeBase();
  // Everything carried gear COULD add to readiness, summed — reachability keys
  // off all potentially-equippable items, as the server's closure does.
  const carriableReadiness = useMemo(() => {
    let readiness = ZERO_READINESS;
    for (const item of owned) {
      const gearBlock = gearStatBlockOf(item);
      if (gearBlock != null) {
        readiness = addBlock(readiness, gearBlock.readiness);
      }
    }
    return readiness;
  }, [owned, gearStatBlockOf]);
  const reachable = useMemo(
    () =>
      new Set(
        reachableStanceIds({
          baseReadiness: baseStats.readiness,
          carriableReadiness,
          activeStanceId,
          stances: stanceRows.map((row) => ({
            id: row.id,
            requirements: row.requirements,
            readiness: row.readiness,
          })),
        }),
      ),
    [baseStats, carriableReadiness, activeStanceId, stanceRows],
  );
  const shown = stanceRows.filter((row) => reachable.has(row.id));

  // The GEARED base adds the worn armor and relics (constant across stances):
  // each stance card shows the full would-be totals it produces with its
  // wielded armaments, and its DELTAS are measured against this geared base, so
  // worn gear never reads as a per-stance change.
  const gearedBase = applyEquipmentIfFits(baseStats, [
    ...(armorEntityId == null ? [] : candidatesOf([armorEntityId])),
    ...candidatesOf(relicEntityIds),
  ]).total;
  const actionsMeetingReadiness = useActionsMeetingReadiness();
  const gearedFlat = flattenGrouped(gearedBase);

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
        // The card's HYPOTHETICAL totals: the geared base plus this stance,
        // with its wielded armaments applied (apply-if-fits, so an armament
        // this stance leaves no grip for drops out of the numbers just as it
        // would live). Delta is measured against the geared base.
        const stanceBlock: GroupedBlock = {
          stats: stance.stats,
          bodyCapacity: stance.bodyCapacity,
          readiness: stance.readiness,
        };
        const stanceSummary = flattenGrouped(stanceBlock);
        const candidateBase = addGrouped(gearedBase, stanceBlock);
        const armamentCandidates = candidatesOf(resolvedArmaments);
        const { total: candidate } = applyEquipmentIfFits(
          candidateBase,
          armamentCandidates,
        );
        const candidateFlat = flattenGrouped(candidate);
        const freeHand = candidate.bodyCapacity.hand;
        // The stance's candidate ACTION set: every action the would-be
        // configuration's READINESS makes available (base + worn gear + this
        // stance + its applied armaments) plus the always-pinnable common verbs.
        const candidateActionIds = [
          ...new Set([
            ...actionsMeetingReadiness(candidate.readiness),
            ...commonPinnable,
          ]),
        ];
        // Highlighting always shows the EFFECTIVE set: the override when
        // one exists, the default items otherwise. Clicking an item while
        // on defaults copy-on-writes the visible set into a new override.
        const isOn = (item: OwnedItem) =>
          resolvedArmaments.includes(item.entityId);
        // Add-guard: an armament not yet wielded is disabled when adding it
        // would leave the resulting override over this stance's grip — the
        // client mirror of the server's per-stance equip gate.
        const fitsAsOverride = (itemId: EntityId): boolean =>
          applyEquipmentIfFits(
            candidateBase,
            candidatesOf([...resolvedArmaments, itemId]),
          ).unappliedEntityIds.length === 0;
        const stanceName = displayNameFrom(STANCE_DISPLAY_NAMES, stance.name);
        return (
          <section className="stanceCard" key={stance.id}>
            <h3>
              {stanceName}
              {stance.id === activeStanceId && " (active)"}
            </h3>
            {signedStatSummary(stanceSummary) !== "" && (
              <div className="stanceSummary">
                <StatBlockSummary statBlock={stanceSummary} />
              </div>
            )}
            <StatGroupsView
              statOf={(key) => candidateFlat[key] ?? 0}
              deltaOf={(key) => (candidateFlat[key] ?? 0) - (gearedFlat[key] ?? 0)}
            />
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
              // Only the ACTIVE stance's armaments are actually equipped, so
              // only its card can show a live "temporarily disabled" mark.
              const isDisabled =
                stance.id === activeStanceId && disabled.has(item.entityId);
              return (
                <Button
                  key={item.entityId.toString()}
                  className={[on ? "active" : "", isDisabled ? "temporarilyDisabled" : ""]
                    .join(" ")
                    .trim()}
                  interesting={on}
                  disabled={!on && !fitsAsOverride(item.entityId)}
                  onClick={() =>
                    connection.reducers.assignStanceArmaments({
                      stanceId: stance.id,
                      armamentEntityIds: toggle(resolvedArmaments, item.entityId),
                    })
                  }
                >
                  <EntityName entityId={item.entityId} />
                  {isDisabled && <span className="disabledMark"> (disabled)</span>}
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
