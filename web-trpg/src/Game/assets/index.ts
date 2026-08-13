import { ACTIONS } from "./actions";
import { APPEARANCE_FEATURES } from "./appearance_features";
import { ARMAMENTS } from "./armaments";
import { ARMORS } from "./armors";
import { BASELINES } from "./baselines";
import { RELICS } from "./relics";
import { ENCOUNTERS, ENCOUNTER_BLOBS } from "./encounters";
import { NAMED_ENTITY_BLOBS, NEW_PLAYER_BLOB } from "./entity_blobs";
import {
  LOCATION_MAPS,
  LOCATION_MAP_CONNECTIONS,
  LOCATION_MAP_THEMES,
} from "./location_maps";
import { STANCES } from "./stances";
import { TRAITS } from "./traits";

// The TS assets ARE the generated wire types, authored as Records keyed by
// canonical name. The client never converts a name to an id — the server
// interns names at push time — and code that holds a runtime id from
// component data resolves it back to a name through the subscribed asset
// tables (see context/StdbContext/assetLookup.ts), then looks the asset up
// here.

/**
 * SATS has no map type, so a Record cannot cross the wire directly: this is
 * the ONE bundling step, turning Record entries into the wire's name+value
 * pairs. Names pass through verbatim from the Record keys.
 */
export const namedPairs = <T>(
  record: Record<string, T>,
): { name: string; value: T }[] =>
  Object.entries(record).map(([name, value]) => ({ name, value }));

export const assets = {
  actions: ACTIONS,
  appearanceFeatures: APPEARANCE_FEATURES,
  baselines: BASELINES,
  traits: TRAITS,
  armaments: ARMAMENTS,
  armors: ARMORS,
  relics: RELICS,
  stances: STANCES,
  encounterBlobs: ENCOUNTER_BLOBS,
  encounters: ENCOUNTERS,
  locationMapThemes: LOCATION_MAP_THEMES,
  locationMaps: LOCATION_MAPS,
  locationMapConnections: LOCATION_MAP_CONNECTIONS,
  namedEntityBlobs: NAMED_ENTITY_BLOBS,
  newPlayerBlob: NEW_PLAYER_BLOB,
};
