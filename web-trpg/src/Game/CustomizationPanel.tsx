import { Button } from "../structural/Button";
import { EntityId } from "./trpg";
import {
  admitsEquipmentItem,
  applyEquipmentIfFits,
  EquipCandidate,
  subtractStatBlocks,
} from "./domain/statBlock";
import {
  OwnedItem,
  useGearStatBlockOf,
  useMyArmorEntityId,
  useMyDefaultActionIds,
  useMyDefaultArmamentEntityIds,
  useMyDisabledEntityIds,
  useMyRelicEntityIds,
  useOwnedItems,
} from "./context/StdbContext/customization";
import {
  useActionDisplayNameOf,
  useCommonPinnableActionIds,
} from "./context/StdbContext/assetLookup";
import { useStanceFreeBase } from "./context/StdbContext/baseStats";
import { useStdbConnection } from "./context/StdbContext/useStdb";
import { ActionsBarEditor } from "./ActionsBarEditor";
import { EntityName } from "./EntityName";
import { IntStatKey } from "./statGroups";
import { StatGroupsView } from "./StatGroupsView";
import { StatBlockSummary } from "./StatBlockSummary";

/** Toggle one item ENTITY in a set — an entity is one thing, so membership
 * is the whole rule (no counting). */
const toggle = (ids: readonly EntityId[], id: EntityId): EntityId[] =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];

/**
 * The equip menu: the SAME card shape as a single stance card — the
 * categorized detailed stats, the armament buttons, the action bar —
 * plus the armor and relics sections only worn gear has. Every button
 * equips one specific owned item ENTITY, rendered with that entity's own
 * appearance name. Its numbers are the HYPOTHETICAL totals the DEFAULT
 * configuration WOULD produce (steady base + worn gear + default armaments,
 * no stance): computed from the configuration, so they update the instant a
 * selection changes — never waiting for the actual equipment to converge on
 * a later action. This is also the base every stance card's deltas compare
 * against, so no deltas render here. What a menu shows it modifies; a gear
 * choice that would over-run a STEADY capacity is disabled outright (the
 * server refuses it too), while an equipped item the LIVE status/stance has
 * dropped is marked temporarily disabled and stays removable.
 */
export const CustomizationPanel = () => {
  const connection = useStdbConnection();
  const owned = useOwnedItems();
  const armorEntityId = useMyArmorEntityId();
  const relicEntityIds = useMyRelicEntityIds();
  const defaultArmamentEntityIds = useMyDefaultArmamentEntityIds();
  const defaultActionIds = useMyDefaultActionIds();
  const gearStatBlockOf = useGearStatBlockOf();
  const { baseStats } = useStanceFreeBase();
  const actionDisplayName = useActionDisplayNameOf();

  const ownedArmors = owned.filter((item) => item.kind === "Armor");
  const ownedRelics = owned.filter((item) => item.kind === "Relic");
  const ownedArmaments = owned.filter((item) => item.kind === "Armament");

  // Equipped-but-unapplied items: worn, but their stats aren't in the total
  // right now because a capacity ran out under the LIVE status/stance. Marked
  // TEMPORARILY disabled — still removable — separate from the add-guard below.
  const disabled = new Set(useMyDisabledEntityIds());
  const className = (on: boolean, id: EntityId): string =>
    [on ? "active" : "", disabled.has(id) ? "temporarilyDisabled" : ""]
      .join(" ")
      .trim();
  const disabledMark = (id: EntityId) =>
    disabled.has(id) ? <span className="disabledMark"> (disabled)</span> : null;

  const ownedByEntityId = new Map(owned.map((item) => [item.entityId, item]));
  const statOfEntityId = (id: EntityId) => {
    const item = ownedByEntityId.get(id);
    return item == null ? null : gearStatBlockOf(item);
  };
  const candidateOf = (id: EntityId): EquipCandidate | null => {
    const block = statOfEntityId(id);
    return block == null ? null : { entityId: id, block };
  };
  const candidatesOf = (ids: readonly EntityId[]): EquipCandidate[] =>
    ids.flatMap((id) => {
      const candidate = candidateOf(id);
      return candidate == null ? [] : [candidate];
    });

  // The DEFAULT configuration's HYPOTHETICAL totals: the steady base with worn
  // armor, worn relics, and the default armaments applied (apply-if-fits, so an
  // over-capacity item drops out just as it would live). This IS the base
  // stances compare to, so it renders with no deltas.
  const configCandidates: EquipCandidate[] = [
    ...(armorEntityId == null ? [] : candidatesOf([armorEntityId])),
    ...candidatesOf(relicEntityIds),
    ...candidatesOf(defaultArmamentEntityIds),
  ];
  const { total: configTotal } = applyEquipmentIfFits(baseStats, configCandidates);
  const defaultConfigStat = (key: IntStatKey): number => configTotal[key];
  // What the applied gear adds up to (dropped gear excluded), for the summary.
  const equippedContribution = subtractStatBlocks(configTotal, baseStats);

  // The default bar's candidate set: everything the applied configuration
  // grants plus the COMMON verbs (take, move, …) — offered or derived in play,
  // absent from any granted set, but pinnable for a stable slot all the same.
  const commonPinnable = useCommonPinnableActionIds();
  const defaultCandidateActionIds = [
    ...new Set([...configTotal.actionIds, ...commonPinnable]),
  ];

  // Add-guards: the capacity a further pick of each kind would face. An item
  // not yet chosen is disabled when applying it would drive a capacity it
  // consumes negative — the client mirror of the server's equip gate.
  const armamentRunning = applyEquipmentIfFits(
    baseStats,
    candidatesOf(defaultArmamentEntityIds),
  ).total;
  const relicRunning = applyEquipmentIfFits(
    baseStats,
    candidatesOf(relicEntityIds),
  ).total;
  const wouldOverflow = (running: typeof baseStats, id: EntityId): boolean => {
    const block = statOfEntityId(id);
    return block != null && !admitsEquipmentItem(running, block);
  };

  const summaryOf = (item: OwnedItem) => {
    const block = gearStatBlockOf(item);
    return block == null ? null : (
      <>
        {" "}
        <StatBlockSummary statBlock={block} />
      </>
    );
  };

  return (
    <div className="Customization stanceCard">
      <h3>Customization</h3>
      {/* The SAME detailed stats view stance cards render — HYPOTHETICAL
          DEFAULT configuration totals, no deltas: this is the base the deltas
          compare to. */}
      <StatGroupsView statOf={defaultConfigStat} />
      <section className="totals">
        <div>
          Equipped: <StatBlockSummary statBlock={equippedContribution} />
        </div>
      </section>
      <section className="armor">
        <h3>Armor</h3>
        <Button
          className={armorEntityId == null ? "active" : ""}
          onClick={() => connection.reducers.clearArmor({})}
        >
          none
        </Button>
        {ownedArmors.map((item) => {
          const on = armorEntityId === item.entityId;
          return (
            <Button
              key={item.entityId.toString()}
              className={className(on, item.entityId)}
              interesting={on}
              disabled={!on && wouldOverflow(baseStats, item.entityId)}
              onClick={() =>
                connection.reducers.setArmor({ itemEntityId: item.entityId })
              }
            >
              <EntityName entityId={item.entityId} />
              {summaryOf(item)}
              {disabledMark(item.entityId)}
            </Button>
          );
        })}
      </section>
      <section className="relics">
        <h3>Relics ({relicEntityIds.length}/4)</h3>
        {ownedRelics.map((item) => {
          const on = relicEntityIds.includes(item.entityId);
          return (
            <Button
              key={item.entityId.toString()}
              className={className(on, item.entityId)}
              interesting={on}
              disabled={
                !on &&
                (relicEntityIds.length >= 4 ||
                  wouldOverflow(relicRunning, item.entityId))
              }
              onClick={() =>
                connection.reducers.setRelics({
                  relicEntityIds: toggle(relicEntityIds, item.entityId),
                })
              }
            >
              <EntityName entityId={item.entityId} />
              {summaryOf(item)}
              {disabledMark(item.entityId)}
            </Button>
          );
        })}
      </section>
      <section className="defaultArmaments">
        <h4>Default armaments (free hand: {defaultConfigStat("hand")})</h4>
        {ownedArmaments.map((item) => {
          const on = defaultArmamentEntityIds.includes(item.entityId);
          return (
            <Button
              key={item.entityId.toString()}
              className={className(on, item.entityId)}
              interesting={on}
              disabled={!on && wouldOverflow(armamentRunning, item.entityId)}
              onClick={() =>
                // CONFIGURATION, applied immediately — the menu's state is
                // true the moment the row lands. Whether the change also
                // queues an in-fiction action is the server's decision.
                connection.reducers.setDefaultArmaments({
                  armamentEntityIds: toggle(
                    defaultArmamentEntityIds,
                    item.entityId,
                  ),
                })
              }
            >
              <EntityName entityId={item.entityId} />
              {summaryOf(item)}
              {disabledMark(item.entityId)}
            </Button>
          );
        })}
        {ownedArmaments.length === 0 && <div>Nothing carried to wield.</div>}
      </section>
      <section className="defaultActions">
        <h4>Default actions ({defaultActionIds.length}/10)</h4>
        <ActionsBarEditor
          assignedActionIds={defaultActionIds}
          nameOf={actionDisplayName}
          onAssign={(actionIds) =>
            connection.reducers.setDefaultActions({ actionIds })
          }
        />
        {defaultCandidateActionIds
          .filter((actionId) => !defaultActionIds.includes(actionId))
          .map((actionId) => (
            <Button
              key={actionId}
              disabled={defaultActionIds.length >= 10}
              onClick={() =>
                connection.reducers.setDefaultActions({
                  actionIds: [...defaultActionIds, actionId],
                })
              }
            >
              {actionDisplayName(actionId)}
            </Button>
          ))}
      </section>
    </div>
  );
};
