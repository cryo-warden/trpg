import { Button } from "../structural/Button";
import { EntityId } from "./trpg";
import { summedStats } from "./domain/statSummary";
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
 * equips one specific owned item ENTITY, rendered with that entity's
 * name. Its numbers are the DEFAULT configuration (base + worn gear +
 * default armaments, no stance): the base every stance card's deltas
 * compare against, so no deltas render here at all. Everything visible
 * here toggles here; all rules are enforced server-side.
 */
export const CustomizationPanel = () => {
  const connection = useStdbConnection();
  const owned = useOwnedItems();
  const armorEntityId = useMyArmorEntityId();
  const relicEntityIds = useMyRelicEntityIds();
  const defaultArmamentEntityIds = useMyDefaultArmamentEntityIds();
  const defaultActionIds = useMyDefaultActionIds();
  const gearStatBlockOf = useGearStatBlockOf();
  const { baseStats, baseActionIds } = useStanceFreeBase();
  const actionDisplayName = useActionDisplayNameOf();

  const ownedArmors = owned.filter((item) => item.kind === "Armor");
  const ownedRelics = owned.filter((item) => item.kind === "Relic");
  const ownedArmaments = owned.filter((item) => item.kind === "Armament");

  // Equipped-but-unapplied items: worn, but their stats aren't in the total
  // right now because a capacity ran out (a bigger status/stance debuff, an
  // over-full slot). Marked TEMPORARILY disabled — still removable.
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

  // The DEFAULT configuration's stats: the stance-free base (worn gear
  // included) plus the default armaments — the values the detailed view
  // shows, with no deltas: this IS the base stances compare to.
  const defaultConfigStat = (key: IntStatKey): number =>
    baseStats[key] +
    defaultArmamentEntityIds.reduce(
      (sum, id) => sum + (statOfEntityId(id)?.[key] ?? 0),
      0,
    );
  // The default bar's candidate set: the base grants plus the default
  // armaments' grants — no stance — plus the COMMON verbs (take, move,
  // …): offered or derived in play, absent from any granted set, but
  // pinnable for a stable slot all the same.
  const commonPinnable = useCommonPinnableActionIds();
  const defaultCandidateActionIds = [
    ...new Set([
      ...baseActionIds,
      ...defaultArmamentEntityIds.flatMap((id) => [
        ...(statOfEntityId(id)?.actionIds ?? []),
      ]),
      ...commonPinnable,
    ]),
  ];

  // What the current gear set adds up to: worn armor + worn relics + the
  // default wielded set, summed from each item's Equippable-equivalent
  // asset block.
  const equippedContribution = summedStats(
    [
      armorEntityId == null ? null : statOfEntityId(armorEntityId),
      ...relicEntityIds.map(statOfEntityId),
      ...defaultArmamentEntityIds.map(statOfEntityId),
    ].flatMap((block) => (block == null ? [] : [block])),
  );

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
      {/* The SAME detailed stats view stance cards render — DEFAULT
          configuration values, no deltas: this is the base the deltas
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
              onClick={() =>
                connection.reducers.setArmor({ itemEntityId: item.entityId })
              }
            >
              {item.name}
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
              disabled={!on && relicEntityIds.length >= 4}
              onClick={() =>
                connection.reducers.setRelics({
                  relicEntityIds: toggle(relicEntityIds, item.entityId),
                })
              }
            >
              {item.name}
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
              {item.name}
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
