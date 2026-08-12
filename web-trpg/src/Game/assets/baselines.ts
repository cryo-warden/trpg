import { StatBlockAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";

// Bodies are the primary providers of the counted property stats: hands to
// hold and swing with, gait to move on, reach to threaten at range. Stances
// and (later) equipment and circumstances add to or consume these.
export const BASELINES = {
  human: statBlock({
    attack: 0,
    mhp: 5,
    defense: 0,
    mep: 5,
    hand: 2,
    gait: 2,
    reach: 1,
    appearanceFeatureNames: ["human"],
  }),
  slime: statBlock({
    attack: -1,
    mhp: 3,
    defense: -1,
    mep: 2,
    gait: 1,
    actionNames: ["slime_spray"],
    appearanceFeatureNames: ["slime"],
  }),
  bat: statBlock({
    attack: 0,
    mhp: 5,
    defense: -1,
    mep: 3,
    gait: 2,
    actionNames: ["scratch"],
    appearanceFeatureNames: ["bat"],
  }),
} satisfies Record<string, StatBlockAsset>;

export type BaselineName = keyof typeof BASELINES;
