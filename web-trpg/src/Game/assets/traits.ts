import { StatBlockAsset } from ".";
import { ACTIONS } from "./actions";

export const TRAITS = [
  { name: "admin", actionNames: ACTIONS.map((a) => a.name) },
  { name: "mobile", actionNames: ["move"] },
  { name: "bopper", actionNames: ["bop", "boppity_bop"] },
  { name: "tiny", attack: -1, mhp: -2 },
  { name: "small", mhp: -1 },
  { name: "big", mhp: 2 },
  { name: "huge", attack: 1, mhp: 5 },
] as const satisfies readonly StatBlockAsset[];
