import { Fragment } from "react";
import { Button } from "../structural/Button";
import { useStanceRows } from "./context/StdbContext/assetLookup";
import {
  useMyArmorId,
  useMyRelicIds,
  useMyStanceAssignments,
  useOwnedItems,
  OwnedItem,
} from "./context/StdbContext/loadout";
import { useStdbConnection } from "./context/StdbContext/useStdb";

/**
 * The stance-customization menu. The loadout model is deliberately simple:
 * ONE clothing/armor slot and up to FOUR relics worn across every stance,
 * then each stance gets its own assigned armaments. All rules (ownership
 * counting, the four-relic cap, grip feasibility) are enforced server-side;
 * this menu only proposes.
 */
export const LoadoutPanel = () => {
  const connection = useStdbConnection();
  const owned = useOwnedItems();
  const armorId = useMyArmorId();
  const relicIds = useMyRelicIds();
  const assignments = useMyStanceAssignments();
  const stances = useStanceRows();

  const ownedArmors = owned.filter((item) => item.kind === "Armor");
  const ownedRelics = owned.filter((item) => item.kind === "Relic");
  const ownedArmaments = owned.filter((item) => item.kind === "Armament");

  // Instance-level toggling over counted asset ids: among the owned items
  // of one asset, the first `count` render as on.
  const instanceIndex = (items: OwnedItem[], item: OwnedItem): number =>
    items
      .filter((other) => other.assetId === item.assetId)
      .findIndex((other) => other.entityId === item.entityId);

  const toggled = (ids: number[], item: OwnedItem, items: OwnedItem[]) => {
    const count = ids.filter((id) => id === item.assetId).length;
    if (instanceIndex(items, item) < count) {
      const next = [...ids];
      next.splice(next.indexOf(item.assetId), 1);
      return next;
    }
    return [...ids, item.assetId];
  };

  const relicIsOn = (item: OwnedItem) =>
    instanceIndex(ownedRelics, item) <
    relicIds.filter((id) => id === item.assetId).length;

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
            className={relicIsOn(item) ? "active" : ""}
            onClick={() =>
              connection.reducers.setRelics({
                relicIds: toggled(relicIds, item, ownedRelics),
              })
            }
          >
            {item.name}
          </Button>
        ))}
      </section>
      <section className="stanceArmaments">
        <h3>Stance armaments</h3>
        {stances.map(({ id, name }) => {
          const assigned =
            assignments.find((a) => a.stanceId === id)?.armamentIds ?? [];
          const armamentIsOn = (item: OwnedItem) =>
            instanceIndex(ownedArmaments, item) <
            assigned.filter((assetId) => assetId === item.assetId).length;
          return (
            <Fragment key={id}>
              <h4>{name}</h4>
              {ownedArmaments.map((item) => (
                <Button
                  key={item.entityId.toString()}
                  className={armamentIsOn(item) ? "active" : ""}
                  onClick={() =>
                    connection.reducers.assignStanceArmaments({
                      stanceId: id,
                      armamentIds: toggled(assigned, item, ownedArmaments),
                    })
                  }
                >
                  {item.name}
                </Button>
              ))}
            </Fragment>
          );
        })}
      </section>
    </div>
  );
};
