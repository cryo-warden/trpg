import { StatBlockAsset } from "../../stdb/types";

export const BASELINES = {
  human: {
    attack: 0,
    mhp: 5,
    defense: 0,
    mep: 5,
    actionNames: [],
    appearanceFeatureNames: ["human"],
  },
  slime: {
    attack: -1,
    mhp: 3,
    defense: -1,
    mep: 2,
    actionNames: ["slime_spray"],
    appearanceFeatureNames: ["slime"],
  },
  bat: {
    attack: 0,
    mhp: 5,
    defense: -1,
    mep: 3,
    actionNames: ["scratch"],
    appearanceFeatureNames: ["bat"],
  },
} satisfies Record<string, StatBlockAsset>;

export type BaselineName = keyof typeof BASELINES;
