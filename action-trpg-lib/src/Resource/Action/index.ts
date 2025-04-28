import type { Engine } from "../../Engine";
import type { Entity } from "../../Entity";
import { validateEffect, type Effect } from "./Effect";
import type { EngineResource, Resource, ResourceActionRecord } from "..";

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

export type Action<TResource extends Resource<TResource>> = {
  name: string;
  effectSequence: readonly Effect<TResource>[];
  renderer: AttackRenderer | null;
};

export type EngineAction<TEngine> = Action<EngineResource<TEngine>>;

export type ActionRecord<
  TResource extends Resource<TResource>,
  T extends Action<TResource>[] = Action<TResource>[]
> = {
  readonly [name in string & T[number]["name"]]: Extract<
    T[number],
    { name: name }
  >;
};

export const createActionRecord = <
  const TResource extends Resource<TResource>,
  const T extends Action<TResource>[]
>(
  actions: T
): ActionRecord<TResource, T> =>
  actions.reduce((result, action) => {
    result[action.name] = action;
    return result;
  }, {} as any);

export const validateActionTarget = <
  const TResource extends Resource<TResource>
>(
  engine: Engine<TResource>,
  action: ResourceActionName<TResource>,
  entity: Entity<TResource>,
  target: Entity<TResource>
) =>
  engine.resource.actionRecord[action].effectSequence.every((effect) =>
    validateEffect(effect, entity, target)
  );

export const recommendActions = <const TResource extends Resource<TResource>>(
  engine: Engine<TResource>,
  entity: Entity<TResource>,
  target: Entity<TResource>
): readonly ResourceActionName<TResource>[] =>
  (entity.actions ?? []).filter((action) =>
    validateActionTarget(engine, action, entity, target)
  );

export type ResourceActionName<TResource extends Resource<TResource>> = string &
  keyof ResourceActionRecord<TResource>;

export * from "./Effect";
