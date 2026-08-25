import { namedBlobTable } from "../assetShort";
import { CREATURE_ROWS } from "../data/creature";
import { creature } from "../processing/creature";

/** GLUE: hydrate the pure creature data table through the creature builder in
 * one pass. The only place authoring (data) meets processing (build). These
 * blobs carry no kind distinction — they merge into the single entity-blob
 * table alongside every other group; the "creature" grouping is authoring-only. */
export const CREATURE_BLOBS = namedBlobTable(creature, CREATURE_ROWS);
export type CreatureName = keyof typeof CREATURE_BLOBS;
