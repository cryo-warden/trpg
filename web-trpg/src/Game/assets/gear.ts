import { EntityBlobAsset } from "../../stdb/types";
import { blob } from "./entity_blobs";
import { FlatBlock, statBlock } from "./stat_block";

/** A gear TEMPLATE authored as an ordinary entity blob — there is no separate
 * gear asset. It carries three things:
 *  - its equip-slot KIND (Armament / Armor / Relic), injected per helper below;
 *  - the Equippable GRANT it confers when worn (a flat stat block; `hand` flows
 *    to BOTH the body-capacity cost and the free-hand readiness, exactly as it
 *    does for a body — see {@link statBlock});
 *  - the item entity's OWN look (`appearanceFeatureNames`), a separate channel
 *    from the grant: a wielder never takes on the look of the gear it holds.
 *
 * The grant's own `appearance` stays empty here (equipment does not repaint the
 * wielder); a wielder's appearance is its own.
 */
const gearBlob =
  (tag: "Armament" | "Armor" | "Relic") =>
  (grant: FlatBlock, appearanceFeatureNames: string[]): EntityBlobAsset =>
    blob({ item: { tag }, equippable: statBlock(grant), appearanceFeatureNames });

export const armament = gearBlob("Armament");
export const armor = gearBlob("Armor");
export const relic = gearBlob("Relic");

/** A placed/loot instance of a gear TEMPLATE: reuse its equip-slot kind and its
 * Equippable grant, but give it a fresh look — either explicit appearance
 * features, or a baseline + variety palette so a dropped weapon rolls its own
 * condition. The template's own look is intentionally dropped; a sword on the
 * ground need not look like the canonical sword. */
export const gearLoot = (
  template: EntityBlobAsset,
  look: Partial<
    Pick<
      EntityBlobAsset,
      "baselineName" | "traitNames" | "appearanceFeatureNames" | "differentiable"
    >
  >,
): EntityBlobAsset =>
  blob({ item: template.item, equippable: template.equippable, ...look });
