import { Button } from "../structural/Button";
import { assetInstanceIsOn, toggledAssetIds } from "./domain/countedAssets";
import { summedStats } from "./domain/statSummary";
import {
  useGearStatBlocks,
  useMyArmorId,
  useMyDefaultArmamentIds,
  useMyRelicIds,
  useOwnedItems,
} from "./context/StdbContext/loadout";
import {
  usePlayerEntity,
  useTotalStatBlockComponent,
} from "./context/StdbContext/components";
import { useStdbConnection } from "./context/StdbContext/useStdb";
import { StatBlockSummary } from "./StatBlockSummary";

/**
 * The worn-gear menu: ONE clothing/armor slot and up to FOUR relics, worn
 * across every stance — plus the DEFAULT armament slot (what the hands
 * hold when the active stance assigns no override; changed in-fiction by
 * the equip/unequip actions, so it displays here without proposing).
 * Above the slots: the player's TOTAL stats, and the combined
 * contribution of everything currently worn and default-wielded. All
 * rules (ownership counting, the four-relic cap) are enforced
 * server-side; this menu only proposes.
 */
export const LoadoutPanel = () => {
  const connection = useStdbConnection();
  const owned = useOwnedItems();
  const armorId = useMyArmorId();
  const relicIds = useMyRelicIds();
  const defaultArmamentIds = useMyDefaultArmamentIds();
  const gearStats = useGearStatBlocks();
  const playerEntity = usePlayerEntity();
  const total = useTotalStatBlockComponent(playerEntity);

  const ownedArmors = owned.filter((item) => item.kind === "Armor");
  const ownedRelics = owned.filter((item) => item.kind === "Relic");
  const ownedArmaments = owned.filter((item) => item.kind === "Armament");

  // The counted-multiset rule for EVERY kind — armor included: two
  // identical armors are two entities, and only the first reads as worn.
  const armorOnIds = armorId == null ? [] : [armorId];

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
    <div className="Loadout">
      <section className="totals">
        <h3>Totals</h3>
        {total != null && (
          <div>
            <StatBlockSummary statBlock={total.statBlock} totals />
          </div>
        )}
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
        <h3>Default armaments</h3>
        {ownedArmaments.map((item) => {
          const on = assetInstanceIsOn({
            ids: defaultArmamentIds,
            item,
            items: ownedArmaments,
          });
          return (
            <Button
              key={item.entityId.toString()}
              className={on ? "active" : ""}
              interesting={on}
              disabled
            >
              {item.name}
              {summaryOf("Armament", item.assetId)}
            </Button>
          );
        })}
        {ownedArmaments.length === 0 && <div>Nothing carried to wield.</div>}
        <div>Changed by the equip and unequip actions.</div>
      </section>
    </div>
  );
};
