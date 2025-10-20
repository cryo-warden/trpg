import { StatBlockAsset } from ".";

export const BASELINES = [
  { name: "human", mhp: 5, mep: 5 },
  {
    name: "slime",
    mhp: 3,
    mep: 2,
    attack: -1,
    defense: -1,
    actionNames: ["slime_spray"],
  },
] as const satisfies readonly StatBlockAsset[];
