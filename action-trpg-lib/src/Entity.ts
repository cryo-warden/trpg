import type { ActionState } from "./structures/ActionState";
import type { Controller } from "./structures/Controller";
import type { Observation } from "./structures/Observation";
import type { StatusEffectMap } from "./structures/StatusEffectMap";

export type Entity = {
  /** A recipient of Damage */
  damageTaker?: {
    /** Defense subtracted from damage */
    defense: number;
    /** Accumulated Damage from a single round */
    accumulatedDamage: number;
    /** Critical Damage Threshold divides your Accumulated Damage to determine how much critical damage you will take for a round. */
    criticalDamageThreshold: number;
  };
  /** A recipient of Critical Damage */
  criticalDamageTaker?: {
    /** Critical Defense subtracted from critical damage */
    criticalDefense: number;
    /** Accumulated Critical Damage from a single round */
    accumulatedCriticalDamage: number;
  };
  /** A recipient of Healing */
  healingTaker?: {
    /** Accumulated Healing from a single round */
    accumulatedHealing: number;
  };
  /** Hit Points */
  hp?: number;
  /** Maximum Hit Points */
  mhp?: number;
  /** Critical Damage Points */
  cdp?: number;
  /** Effort Points */
  ep?: number;
  /** Maximum Effort Points */
  mep?: number;
  /** Status Effect Map */
  status?: StatusEffectMap;
  /** An Actor capable of participating in combat. */
  actor?: {
    /** Attack added to attack effects */
    attack: number;
    /** Action State */
    actionState: null | ActionState;
  };
  /** A recipient of Observations */
  observer?: Observation[];
  /** An emitter of Observations */
  observable?: Observation[];
  /** A Controller to assign actions */
  controller?: Controller;
};

export type EntityWithComponents<TComponentNames extends (keyof Entity)[]> = {
  [name in Exclude<keyof Entity, TComponentNames[number]>]?: Entity[name];
} & {
  [name in TComponentNames[number]]-?: Exclude<Entity[name], undefined>;
};

export const hasComponents = <const TComponentNames extends (keyof Entity)[]>(
  entity: Entity,
  componentNames: TComponentNames
): entity is EntityWithComponents<TComponentNames> => {
  for (let n of componentNames) {
    if (!(n in entity)) {
      return false;
    }
  }
  return true;
};

export const cloneComponent = <T>(component: T): T =>
  component === Object(component) ? { ...component } : component;

export const cloneEntity = <TEntity extends EntityWithComponents<any>>(
  entity: TEntity
): TEntity => {
  return Object.entries(entity).reduce((newEntity, [name, component]) => {
    (newEntity as any)[name] = cloneComponent(component);
    return newEntity;
  }, {} as TEntity);
};

type MergedEntity<
  T extends EntityWithComponents<any>,
  U extends EntityWithComponents<any>
> = {
  [name in (keyof T | keyof U) & keyof Entity]: Exclude<
    Entity[name],
    undefined
  >;
};

export const mergeEntity = <
  TEntityA extends EntityWithComponents<any>,
  TEntityB extends EntityWithComponents<any>
>(
  a: TEntityA,
  b: TEntityB
): MergedEntity<TEntityA, TEntityB> => {
  return Object.entries(b).reduce((a, [name, component]) => {
    (a as any)[name] = cloneComponent(component);
    return a;
  }, cloneEntity(a)) as any;
};

export const createEntityFactory =
  <TBaseEntity extends EntityWithComponents<any>>(baseEntity: TBaseEntity) =>
  <TCustomFields extends EntityWithComponents<any>>(
    customFields: TCustomFields
  ): MergedEntity<TBaseEntity, TCustomFields> =>
    mergeEntity(baseEntity, customFields);
