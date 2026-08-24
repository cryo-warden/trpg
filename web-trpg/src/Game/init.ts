import { DbConnection } from "../stdb";
import { namedPairs } from "./assets";
import { blobPairs, validatedBlob } from "./assets/assetShort";
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
      // Gear is now ordinary entity blobs — one flat registry keyed by name
      // (each name is unique across the three kinds). The equip SLOT lives on
      // each blob's item component, not in a per-kind table. blobPairs runs the
      // escape-hatch validator over every blob record (see assetShort.ts).
      gearBlobs: blobPairs({ ...ARMAMENTS, ...ARMORS, ...RELICS }),
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
      encounterBlobs: blobPairs(ENCOUNTER_BLOBS),
      encounters: namedPairs(ENCOUNTERS),
      locationMapThemes: namedPairs(LOCATION_MAP_THEMES),
      locationMaps: namedPairs(LOCATION_MAPS),
      connections: LOCATION_MAP_CONNECTIONS,
      namedInstantiateEntityBlobs: blobPairs(NAMED_ENTITY_BLOBS),
      instantiateEntityBlobs: [],
      newPlayerBlob: validatedBlob("new_player", NEW_PLAYER_BLOB),
    },
  });
