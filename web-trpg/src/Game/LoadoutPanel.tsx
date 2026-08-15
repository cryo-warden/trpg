import { Button } from "../structural/Button";
import { assetInstanceIsOn, toggledAssetIds } from "./domain/countedAssets";
import { summedStats } from "./domain/statSummary";
import {
  useGearStatBlocks,
  useMyArmorId,
  useMyDefaultActionIds,
  useMyDefaultArmamentIds,
  useMyEquipmentArmamentIds,
  useMyRelicIds,
  useOwnedItems,
} from "./context/StdbContext/loadout";
import {
  usePlayerEntity,
  useTotalStatBlockComponent,
} from "./context/StdbContext/components";
import {
  useActionDisplayNameOf,
  useSpecialActionIds,
} from "./context/StdbContext/assetLookup";
import { useStanceFreeBase } from "./context/StdbContext/baseStats";
import { useStdbConnection } from "./context/StdbContext/useStdb";
import { ActionsBarEditor } from "./ActionsBarEditor";
import { IntStatKey, STAT_GROUPS } from "./statGroups";
import { StatBlockSummary } from "./StatBlockSummary";

/**
 * The equip menu: the SAME card shape as a single stance card — the
 * categorized detailed stats, the armament buttons, the action bar —
 * plus the armor and relics sections only worn gear has. Its numbers
 * are the DEFAULT configuration (base + worn gear + default armaments,
 * no stance): the base every stance card's deltas compare against, so
 * no deltas render here at all. Everything visible here toggles here:
 * armament buttons queue the registered equip/unequip ACTION against
 * the item entity — a round like any act — the DEFAULT action bar
 * proposes set_default_actions (what a stance change pins when the
 * stance has no bar of its own), and a button that cannot be used right
 * now renders visibly disabled, re-enabling live as gear changes. All
 * rules are enforced server-side; this menu only proposes.
 */
export const LoadoutPanel = () => {
  const connection = useStdbConnection();
  const owned = useOwnedItems();
  const armorId = useMyArmorId();
  const relicIds = useMyRelicIds();
  const defaultArmamentIds = useMyDefaultArmamentIds();
  const defaultActionIds = useMyDefaultActionIds();
  const gearStats = useGearStatBlocks();
  const playerEntity = usePlayerEntity();
  const total = useTotalStatBlockComponent(playerEntity);
  const specialActionIds = useSpecialActionIds();
  const { baseStats, baseActionIds } = useStanceFreeBase();
  const actionDisplayName = useActionDisplayNameOf();

  const ownedArmors = owned.filter((item) => item.kind === "Armor");
  const ownedRelics = owned.filter((item) => item.kind === "Relic");
  const ownedArmaments = owned.filter((item) => item.kind === "Armament");

  // The counted-multiset rule for EVERY kind — armor included: two
  // identical armors are two entities, and only the first reads as worn.
  const armorOnIds = armorId == null ? [] : [armorId];

  // The grip rule evaluates the configuration these buttons EDIT: the
  // stats you would have using the DEFAULT set — the total with the
  // in-hand set swapped for the defaults — never whatever stance
  // override happens to be in hand right now. Mirror of the server's
  // default_configuration_hand.
  const equipmentArmamentIds = useMyEquipmentArmamentIds();
  const armamentHandOf = (assetId: number) =>
    gearStats.armaments.get(assetId)?.hand ?? 0;
  const defaultConfigurationHand =
    (total?.statBlock.hand ?? 0) -
    equipmentArmamentIds.reduce((sum, id) => sum + armamentHandOf(id), 0) +
    defaultArmamentIds.reduce((sum, id) => sum + armamentHandOf(id), 0);

  // The DEFAULT configuration's stats: the stance-free base (worn gear
  // included) plus the default armaments — the values the detailed view
  // shows, with no deltas: this IS the base stances compare to.
  const defaultConfigStat = (key: IntStatKey): number =>
    baseStats[key] +
    defaultArmamentIds.reduce(
      (sum, id) => sum + (gearStats.armaments.get(id)?.[key] ?? 0),
      0,
    );
  // The default bar's candidate pool: the base grants plus the default
  // armaments' grants — no stance.
  const defaultPoolActionIds = [
    ...new Set([
      ...baseActionIds,
      ...defaultArmamentIds.flatMap((id) => [
        ...(gearStats.armaments.get(id)?.actionIds ?? []),
      ]),
    ]),
  ];

  // What the current gear set adds up to: worn armor + worn relics + the
  // default wielded set, summed from the ASSET blocks.
  const equippedContribution = summedStats([
    ...(armorId == null ? [] : [gearStats.armors.get(armorId)]).flatMap(
      (block) => (block == null ? [] : [block]),
    ),
    ...relicIds.flatMap((id) => {
      const block = gearStats.relics.get(id);
      return block == null ? [] : [block];
    }),
    ...defaultArmamentIds.flatMap((id) => {
      const block = gearStats.armaments.get(id);
      return block == null ? [] : [block];
    }),
  ]);

  const summaryOf = (kind: "Armament" | "Armor" | "Relic", assetId: number) => {
    const block = (
      kind === "Armament"
        ? gearStats.armaments
        : kind === "Armor"
          ? gearStats.armors
          : gearStats.relics
    ).get(assetId);
    return block == null ? null : (
      <>
        {" "}
        <StatBlockSummary statBlock={block} />
      </>
    );
  };

  return (
    <div className="Loadout stanceCard">
      <h3>Loadout</h3>
      {/* The stance card's detailed stats view — DEFAULT configuration
          values, no deltas: this is the base the deltas compare to. */}
      {STAT_GROUPS.map((group) => (
        <div className="statGroup" key={group.label}>
          <h4>{group.label}</h4>
          <div className="totals">
            {group.stats.map(([key, label]) => (
              <div key={key}>
                {label} {defaultConfigStat(key)}
              </div>
            ))}
          </div>
        </div>
      ))}
      <section className="totals">
        <div>
          Equipped: <StatBlockSummary statBlock={equippedContribution} />
        </div>
      </section>
      <section className="armor">
        <h3>Armor</h3>
        <Button
          className={armorId == null ? "active" : ""}
          onClick={() => connection.reducers.clearArmor({})}
        >
          none
        </Button>
        {ownedArmors.map((item) => {
          const on = assetInstanceIsOn({
            ids: armorOnIds,
            item,
            items: ownedArmors,
          });
          return (
            <Button
              key={item.entityId.toString()}
              className={on ? "active" : ""}
              interesting={on}
              onClick={() =>
                connection.reducers.setArmor({ armorId: item.assetId })
              }
            >
              {item.name}
              {summaryOf("Armor", item.assetId)}
            </Button>
          );
        })}
      </section>
      <section className="relics">
        <h3>Relics ({relicIds.length}/4)</h3>
        {ownedRelics.map((item) => (
          <Button
            key={item.entityId.toString()}
            className={
              assetInstanceIsOn({ ids: relicIds, item, items: ownedRelics })
                ? "active"
                : ""
            }
            interesting={assetInstanceIsOn({
              ids: relicIds,
              item,
              items: ownedRelics,
            })}
            disabled={
              !assetInstanceIsOn({ ids: relicIds, item, items: ownedRelics }) &&
              relicIds.length >= 4
            }
            onClick={() =>
              connection.reducers.setRelics({
                relicIds: toggledAssetIds({
                  ids: relicIds,
                  item,
                  items: ownedRelics,
                }),
              })
            }
          >
            {item.name}
            {summaryOf("Relic", item.assetId)}
          </Button>
        ))}
      </section>
      <section className="defaultArmaments">
        <h4>
          Default armaments (free hand: {defaultConfigurationHand})
        </h4>
        {ownedArmaments.map((item) => {
          const on = assetInstanceIsOn({
            ids: defaultArmamentIds,
            item,
            items: ownedArmaments,
          });
          const verbActionId = on
            ? specialActionIds.unequip
            : specialActionIds.equip;
          // Mirror of equip_item's grip rule: wielding this must keep
          // the DEFAULT configuration's hands non-negative. Unequipping
          // always frees.
          const overweight =
            !on && defaultConfigurationHand + armamentHandOf(item.assetId) < 0;
          return (
            <Button
              key={item.entityId.toString()}
              className={on ? "active" : ""}
              interesting={on}
              disabled={verbActionId == null || overweight}
              onClick={() => {
                if (verbActionId != null) {
                  connection.reducers.act({
                    actionId: verbActionId,
                    targetEntityId: item.entityId,
                  });
                }
              }}
            >
              {item.name}
              {summaryOf("Armament", item.assetId)}
            </Button>
          );
        })}
        {ownedArmaments.length === 0 && <div>Nothing carried to wield.</div>}
        <div>Toggling queues the equip or unequip action — a round like
        any act.</div>
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
        {defaultPoolActionIds
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
