import type { With } from "miniplex";
import type { ActionState } from "./structures/ActionState";
import type { Controller } from "./structures/Controller";
import type { Observation } from "./structures/Observation";
import type { StatusEffectMap } from "./structures/StatusEffectMap";
import type { Baseline } from "./structures/Baseline";
import type { Trait } from "./structures/Trait";

export type Entity = {
  /** Display Name */
  name: string;
  /** A recipient of Damage */
  damageTaker?: {
    /** Accumulated Damage from a single round */
    accumulatedDamage: number;
    /** Critical Damage Threshold divides your Accumulated Damage to determine how much critical damage you will take for a round. */
    criticalDamageThreshold: number;
  };
  /** A recipient of Critical Damage */
  criticalDamageTaker?: {
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
  /** Attack added to attack effects */
  attack?: number;
  /** Defense subtracted from damage */
  defense?: number;
  /** Critical Defense subtracted from critical damage */
  criticalDefense?: number;

  /** An Actor capable of participating in combat. */
  actor?: {
    /** Action State */
    actionState: null | ActionState;
  };
  /** A Controller to assign actions */
  controller?: Controller;
  /** A recipient of Observations */
  observer?: Observation[];
  /** An emitter of Observations */
  observable?: Observation[];

  /** Another Entity in which this one is located, if any. */
  location?: Entity | null;
  /** Entities located inside this one. */
  contents?: Entity[];
  /** A clean flag to skip update of contents. */
  contentsCleanFlag?: true;

  /** A path to another location. */
  path?: { destination: Entity };

  /** Baseline for building an entity's changeable stats. */
  baseline?: Baseline;
  /** List of traits to alter an entity's changeable stats. */
  traits?: Trait[];
  /** Traits stat cache. */
  traitsStatCache?: Trait;
  /** A clean flag to skip update of trait stat cache. */
  traitsStatCacheCleanFlag?: true;
  /** List of equipped items to alter an entity's changeable stats. */
  equipment?: Entity[];
  /** Equipment stat cache. */
  equipmentStatCache?: Trait;
  /** A clean flag to skip update of equipment stat cache. */
  equipmentStatCacheCleanFlag?: true;
  /** Status Effect Map */
  status?: StatusEffectMap;
  /** Status stat cache. */
  statusStatCache?: Trait;
  /** A clean flag to skip update of status stat cache. */
  statusStatCacheCleanFlag?: true;
  /** A clean flag to skip update of total stats. */
  statsCleanFlag?: true;

  /** Stats applied if this is equipped. */
  equippable?: {
    slot: "head" | "hand" | "torso" | "legs";
    /** The amount of capacity consumed while equipping this. */
    capacityCost: number;
    trait: Trait;
  };
  // /** The action this item takes if consumed. */
  // TODO consumable: Action;
};

const entityComponentNameSet = new Set<string>([
  "location",
] satisfies (keyof Entity)[]);

export const hasComponents = <const TComponentNames extends (keyof Entity)[]>(
  entity: Entity,
  componentNames: TComponentNames
): entity is With<Entity, TComponentNames[number]> => {
  for (let n of componentNames) {
    if (!(n in entity)) {
      return false;
    }
  }
  return true;
};

export const cloneComponent = <T>(component: T): T =>
  Array.isArray(component)
    ? ([...component] as any)
    : component === Object(component)
    ? { ...component }
    : component;

export const cloneEntity = <TEntity extends Entity>(
  entity: TEntity
): TEntity => {
  return Object.entries(entity).reduce((newEntity, [name, component]) => {
    (newEntity as any)[name] = cloneComponent(component);
    return newEntity;
  }, {} as TEntity);
};

type MergedEntity<T extends With<Entity, any>, U extends Partial<Entity>> = {
  [name in (keyof T | keyof U) & keyof Entity]: Exclude<
    Entity[name],
    undefined
  >;
};

export const mergeEntity = <
  TEntityA extends With<Entity, any>,
  TEntityB extends Partial<Entity>
>(
  a: TEntityA,
  b: TEntityB
): MergedEntity<TEntityA, TEntityB> => {
  return Object.entries(b).reduce((a, [name, component]) => {
    if (entityComponentNameSet.has(name)) {
      (a as any)[name] = component;
    } else {
      (a as any)[name] = cloneComponent(component);
    }
    return a;
  }, cloneEntity(a)) as any;
};

export const createEntityFactory =
  <TBaseEntity extends With<Entity, any>>(baseEntity: TBaseEntity) =>
  <TCustomFields extends Partial<Entity>>(
    customFields: TCustomFields
  ): MergedEntity<TBaseEntity, TCustomFields> =>
    mergeEntity(baseEntity, customFields);
