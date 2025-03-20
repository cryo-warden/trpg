import type { StatBlock } from "./StatBlock";

export type Equippable = {
  slot: "head" | "hand" | "torso" | "legs";
  /** The amount of capacity consumed while equipping this. */
  capacityCost: number;
  statBlock: StatBlock;
};
