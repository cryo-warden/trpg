import type { Entity } from "../Entity";
import { effect, validateEffect, type Effect } from "./Effect";

export type Action = {
  name: string;
  effectSequence: Effect[];
};

export const validateActionTarget = (
  action: Action,
  entity: Entity,
  target: Entity
) =>
  action.effectSequence.every((effect) =>
    validateEffect(effect, entity, target)
  );

export const recommendActions = (entity: Entity, target: Entity): Action[] =>
  (entity.actions ?? []).filter((action) =>
    validateActionTarget(action, entity, target)
  );
