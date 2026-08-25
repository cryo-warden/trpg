import { namedBlobTable } from "../assetShort";
import { creature } from "./build";
import { CREATURE_ROWS } from "./data";

export type { CreatureAssetShort } from "./types";
export { creature } from "./build";
export { CREATURE_ROWS } from "./data";

/** GLUE: hydrate the pure creature data table through the creature builder in
 * one pass. This is the only place authoring (data) meets processing (build). */
export const CREATURE_BLOBS = namedBlobTable(creature, CREATURE_ROWS);
export type CreatureName = keyof typeof CREATURE_BLOBS;
