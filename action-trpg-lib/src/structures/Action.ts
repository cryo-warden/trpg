import type { Entity } from "../Entity";
import { validateEffect, type Effect } from "./Effect";

export const actionWeightType = ["heavy", "neutral", "light"] as const;

export type ActionWeightType = (typeof actionWeightType)[number];

export const actionSpeedType = ["slow", "neutral", "fast"] as const;

export type ActionSpeedType = (typeof actionSpeedType)[number];

export const actionArmamentType = [
  "blade",
  "sword",
  "club",
  "staff",
  "fist",
  "claw",
  "teeth",
  "stick",
  "spout",
] as const;

export type ActionArmamentType = (typeof actionArmamentType)[number];

export type AttackRenderer = {
  weightType: ActionWeightType;
  speedType: ActionSpeedType;
  armamentType: ActionArmamentType;
};

export type Action = {
  name: string;
  effectSequence: Effect[];
  renderer: AttackRenderer | null;
};

export type ActionRecord<T extends Action[] = Action[]> = {
  [name in T[number]["name"]]: Extract<T[number], { name: name }>;
};

export const createActionRecord = <const T extends Action[]>(
  actions: T
): ActionRecord<T> =>
  actions.reduce((result, action) => {
    result[action.name] = action;
    return result;
  }, {} as any);

export const validateActionTarget = (
  action: Action,
  entity: Entity,
  target: Entity
) =>
  action.effectSequence.every((effect) =>
    validateEffect(effect, entity, target)
  );

export const recommendActions = (entity: Entity, target: Entity): Action[] =>
  Object.values(entity.actionRecord ?? {}).filter((action) =>
    validateActionTarget(action, entity, target)
  );
