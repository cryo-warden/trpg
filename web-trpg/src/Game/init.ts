import { DbConnection } from "../stdb";
import { namedPairs } from "./assets";
import { ACTIONS } from "./assets/actions";
import { APPEARANCE_FEATURES } from "./assets/appearance_features";
import { ARMAMENTS } from "./assets/armaments";
import { ARMORS } from "./assets/armors";
import { BASELINES } from "./assets/baselines";
import { RELICS } from "./assets/relics";
import { ENCOUNTERS, ENCOUNTER_BLOBS } from "./assets/encounters";
import { NAMED_ENTITY_BLOBS, NEW_PLAYER_BLOB } from "./assets/entity_blobs";
import {
  LOCATION_MAPS,
  LOCATION_MAP_THEMES,
} from "./assets/location_maps";
import { STANCES } from "./assets/stances";
import { TRAITS } from "./assets/traits";

/** Pushes the production asset pack. Admin-gated server-side: only an
 * attached, rotated admin account may call this — clients never push
 * automatically. The assets ARE the wire types; bundling Records into
 * name+value entries is the only client-side step, and all name -> id
 * resolution happens on the server (see server/src/asset/types.rs). */
export const pushProductionAssets = (connection: DbConnection): Promise<void> =>
  connection.reducers.pushAssets({
    assetPack: {
      actions: namedPairs(ACTIONS),
      appearanceFeatures: namedPairs(APPEARANCE_FEATURES),
      baselines: namedPairs(BASELINES),
      traits: namedPairs(TRAITS),
      armaments: namedPairs(ARMAMENTS),
      armors: namedPairs(ARMORS),
      relics: namedPairs(RELICS),
      stances: namedPairs(STANCES),
      coweringStanceName: "cowering",
      encounterBlobs: namedPairs(ENCOUNTER_BLOBS),
      encounters: namedPairs(ENCOUNTERS),
      locationMapThemes: namedPairs(LOCATION_MAP_THEMES),
      locationMaps: namedPairs(LOCATION_MAPS),
      namedInstantiateEntityBlobs: namedPairs(NAMED_ENTITY_BLOBS),
      instantiateEntityBlobs: [],
      newPlayerBlob: NEW_PLAYER_BLOB,
    },
  });
