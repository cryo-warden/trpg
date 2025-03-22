import type { Entity } from "../Entity";
import { effect, type Effect } from "./Effect";

export type Action = {
  effectSequence: Effect[];
};

export const recommendActions = (entity: Entity, target: Entity): Action[] => [
  ...(target.path != null ? [{ effectSequence: [effect.move] }] : []),
  ...(target.takeable != null && !entity.equipment?.includes(target)
    ? [
        entity.contents?.includes(target)
          ? { effectSequence: [effect.drop] }
          : { effectSequence: [effect.take] },
      ]
    : []),
  ...(target.equippable != null
    ? [
        entity.equipment?.includes(target)
          ? { effectSequence: [effect.normalUnequip] }
          : { effectSequence: [effect.normalEquip] },
      ]
    : []),
];
