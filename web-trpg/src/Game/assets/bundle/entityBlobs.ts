import { EntityBlobAsset } from "../../../stdb/types";
import { ARMAMENTS } from "../armaments";
import { ARMORS } from "../armors";
import { RELICS } from "../relics";
import { CREATURE_BLOBS } from "./creature";
import { ENCOUNTER_ENEMY_BLOB } from "../encounters";
import { NAMED_ENTITY_BLOBS, NEW_PLAYER_BLOB } from "../entity_blobs";
import { LOCATION_MAP_BLOBS } from "../location_maps";

// GLUE: the ONE unified entity-blob table. Every blob TEMPLATE — creatures,
// gear, the encounter categoric fragment, the named world entities, the
// new-player template, and every formerly-inline location-map blob — merges
// here into a single name-keyed record. Names are GLOBALLY UNIQUE across all
// former kinds (the server rejects a duplicate at push); the throw-on-duplicate
// merge below catches a collision at author time instead of silently
// overwriting.

/** Merge blob records left to right, throwing on any repeated key. A plain
 * object spread would let a later group silently clobber an earlier one; this
 * makes a cross-group name collision fail loudly right here. */
const mergeUnique = (
  groups: Record<string, EntityBlobAsset>[],
): Record<string, EntityBlobAsset> => {
  const merged: Record<string, EntityBlobAsset> = {};
  for (const group of groups) {
    for (const [name, value] of Object.entries(group)) {
      if (Object.prototype.hasOwnProperty.call(merged, name)) {
        throw new Error(`Duplicate entity-blob name "${name}"`);
      }
      merged[name] = value;
    }
  }
  return merged;
};

/** The name of the new-player template within {@link ENTITY_BLOBS}. */
export const NEW_PLAYER_BLOB_NAME = "new_player";

/** The name of the bare enemy-controller categoric fragment. */
const ENCOUNTER_ENEMY_BLOB_NAME = "encounter_enemy";

export const ENTITY_BLOBS: Record<string, EntityBlobAsset> = mergeUnique([
  CREATURE_BLOBS,
  ARMAMENTS,
  ARMORS,
  RELICS,
  { [ENCOUNTER_ENEMY_BLOB_NAME]: ENCOUNTER_ENEMY_BLOB },
  NAMED_ENTITY_BLOBS,
  { [NEW_PLAYER_BLOB_NAME]: NEW_PLAYER_BLOB },
  LOCATION_MAP_BLOBS,
]);

/** The templates instantiated as world entities at push (former
 * namedInstantiate set): allegiance1/2, world_surface, sky. Referenceable by
 * "Named" refs from other blobs. */
export const INSTANTIATE_ENTITY_BLOB_NAMES: string[] =
  Object.keys(NAMED_ENTITY_BLOBS);
