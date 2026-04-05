import { StatBlockAsset } from ".";

export const BASELINES = [
  { name: "human", mhp: 5, mep: 5, appearanceFeatureNames: ["human"] },
  {
    name: "slime",
    mhp: 3,
    mep: 2,
    attack: -1,
    defense: -1,
    actionNames: ["slime_spray"],
    appearanceFeatureNames: ["slime"],
  },
  {
    name: "bat",
    mhp: 5,
    mep: 3,
    attack: 0,
    defense: -1,
    actionNames: ["scratch"],
    appearanceFeatureNames: ["bat"],
  },
] as const satisfies readonly StatBlockAsset[];
