import { StatBlockAsset } from ".";

export const BASELINES = {
  human: { mhp: 5, mep: 5, appearanceFeatureNames: ["human"] },
  slime: {
    mhp: 3,
    mep: 2,
    attack: -1,
    defense: -1,
    actionNames: ["slime_spray"],
    appearanceFeatureNames: ["slime"],
  },
  bat: {
    mhp: 5,
    mep: 3,
    attack: 0,
    defense: -1,
    actionNames: ["scratch"],
    appearanceFeatureNames: ["bat"],
  },
} as const satisfies Record<string, StatBlockAsset>;

export type BaselineName = keyof typeof BASELINES;
