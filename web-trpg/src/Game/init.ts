import { DbConnection } from "../stdb";
import { namedPairs } from "./assets";
import { blobPairs } from "./assets/assetShort";
import { ACTIONS } from "./assets/actions";
import { APPEARANCE_FEATURES } from "./assets/appearance_features";
import { BASELINES } from "./assets/baselines";
import { ENCOUNTERS } from "./assets/encounters";
import {
  ENTITY_BLOBS,
  INSTANTIATE_ENTITY_BLOB_NAMES,
  NEW_PLAYER_BLOB_NAME,
} from "./assets/bundle/entityBlobs";
import {
  LOCATION_MAPS,
  LOCATION_MAP_CONNECTIONS,
  LOCATION_MAP_THEMES,
} from "./assets/location_maps";
import { QUESTS } from "./assets/quests";
import { STANCES } from "./assets/stances";
import { TRAITS } from "./assets/traits";
import { TRAIT_PALETTES } from "./assets/trait_palettes";

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
      traitPalettes: namedPairs(TRAIT_PALETTES),
      stances: namedPairs(STANCES),
      quests: namedPairs(QUESTS),
      proneStanceName: "prone",
      // The derived item verbs: which authored action serves each role.
      // No baseline grants these — targets offer them (see the
      // special-action registry and the client's option derivation).
      takeActionName: "take",
      dropActionName: "drop",
      equipActionName: "equip",
      unequipActionName: "unequip",
      eatActionName: "eat",
      rearmActionName: "re_arm",
      moveActionName: "move",
      encounters: namedPairs(ENCOUNTERS),
      locationMapThemes: namedPairs(LOCATION_MAP_THEMES),
      locationMaps: namedPairs(LOCATION_MAPS),
      connections: LOCATION_MAP_CONNECTIONS,
      // The ONE unified entity-blob table: every template, name-keyed. The
      // instantiate set and new-player template are named refs into it.
      entityBlobs: blobPairs(ENTITY_BLOBS),
      instantiateEntityBlobNames: INSTANTIATE_ENTITY_BLOB_NAMES,
      newPlayerBlobName: NEW_PLAYER_BLOB_NAME,
    },
  });
