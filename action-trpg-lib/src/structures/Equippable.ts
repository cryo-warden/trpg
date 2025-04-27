import type { Resource } from "./Resource";
import type { StatBlock } from "./StatBlock";

export type Equippable<TResource extends Resource<TResource>> = {
  slot: "head" | "hand" | "torso" | "legs";
  /** The amount of capacity consumed while equipping this. */
  capacityCost: number;
  statBlock: StatBlock<TResource>;
};
