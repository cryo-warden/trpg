import type { Entity } from "../Entity";
import { effect, type Effect } from "./Effect";

export type Action = {
  effectSequence: Effect[];
};

export const recommendActions = (target: Entity): Action[] => [
  ...(target.path != null ? [{ effectSequence: [effect.move] }] : []),
  ...(target.takeable != null
    ? [{ effectSequence: [effect.drop] }, { effectSequence: [effect.take] }]
    : []),
  ...(target.equippable != null
    ? [
        { effectSequence: [effect.normalEquip] },
        { effectSequence: [effect.normalUnequip] },
      ]
    : []),
];
