import type { Entity } from "../Entity";
import { effect, type Effect } from "./Effect";

export type Action = {
  name: string;
  effectSequence: Effect[];
};

export const recommendActions = (entity: Entity, target: Entity): Action[] => [
  ...(target.path != null
    ? [{ name: "Move", effectSequence: [effect.move] }]
    : []),
  ...(target.takeable != null && !entity.equipment?.includes(target)
    ? [
        entity.contents?.includes(target)
          ? { name: "Drop", effectSequence: [effect.drop] }
          : { name: "Take", effectSequence: [effect.take] },
      ]
    : []),
  ...(target.equippable != null
    ? [
        entity.equipment?.includes(target)
          ? { name: "Unequip", effectSequence: [effect.normalUnequip] }
          : { name: "Equip", effectSequence: [effect.normalEquip] },
      ]
    : []),
];
