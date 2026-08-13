import { Button } from "../structural/Button";
import {
  assetInstanceIsOn,
  toggledAssetIds,
  useMyArmorId,
  useMyRelicIds,
  useOwnedItems,
} from "./context/StdbContext/loadout";
import { useStdbConnection } from "./context/StdbContext/useStdb";

/**
 * The worn-gear menu: ONE clothing/armor slot and up to FOUR relics, worn
 * across every stance. Per-stance armaments live in the stances menu. All
 * rules (ownership counting, the four-relic cap) are enforced server-side;
 * this menu only proposes.
 */
export const LoadoutPanel = () => {
  const connection = useStdbConnection();
  const owned = useOwnedItems();
  const armorId = useMyArmorId();
  const relicIds = useMyRelicIds();

  const ownedArmors = owned.filter((item) => item.kind === "Armor");
  const ownedRelics = owned.filter((item) => item.kind === "Relic");

  return (
    <div className="Loadout">
      <section className="armor">
        <h3>Armor</h3>
        <Button
          className={armorId == null ? "active" : ""}
          onClick={() => connection.reducers.clearArmor({})}
        >
          none
        </Button>
        {ownedArmors.map((item) => (
          <Button
            key={item.entityId.toString()}
            className={item.assetId === armorId ? "active" : ""}
            onClick={() => connection.reducers.setArmor({ armorId: item.assetId })}
          >
            {item.name}
          </Button>
        ))}
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
          </Button>
        ))}
      </section>
    </div>
  );
};
