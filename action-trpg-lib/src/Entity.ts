import type { With } from "miniplex";
import type { ActionState } from "./structures/ActionState";
import type { Controller } from "./structures/Controller";
import type { Equippable } from "./structures/Equippable";
import type { Baseline, StatBlock, Trait } from "./structures/StatBlock";
import type { ActionRecord } from "./structures/Action";
import type { EntityEvent } from "./structures/EntityEvent";

export type Entity = {
  /** Display Name */
  name: string;
  /** Accumulated Damage from a single round */
  accumulatedDamage?: number;
  /** Critical Damage Threshold divides your Accumulated Damage to determine how much critical damage you will take for a round. */
  criticalDamageThreshold?: number;
  /** Accumulated Critical Damage from a single round */
  accumulatedCriticalDamage?: number;
  /** Accumulated Healing from a single round */
  accumulatedHealing?: number;
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
  /** The actions available to this entity */
  actionRecord?: ActionRecord;

  /** The action this entity is currently performing */
  actionState?: ActionState;

  /** Allegiance to other entities */
  allegiance?: Entity;
  /** A Controller to assign actions */
  controller?: Controller;
  /** Events applied to this entity */
  events?: EntityEvent[];
  /** A recipient of entity events from the same location */
  observer?: EntityEvent[];

  /*** Location and Contents ***/

  /** Another Entity in which this one is located */
  location?: Entity;
  /** Entities located inside this one. */
  contents?: Entity[];
  /** A clean flag to skip update of contents. */
  contentsCleanFlag?: true;

  /** A path to another location. */
  path?: { destination: Entity };

  /*** Stats ***/

  /** Baseline for building an entity's changeable stats. */
  baseline?: Baseline;
  /** List of traits to alter an entity's changeable stats. */
  traits?: Trait[];
  /** Traits stat cache. */
  traitsStatBlock?: StatBlock;
  /** A clean flag to skip update of trait stat cache. */
  traitsStatBlockCleanFlag?: true;
  /** List of equipped items to alter an entity's changeable stats. */
  equipment?: Entity[];
  /** Equipment stat cache. */
  equipmentStatBlock?: StatBlock;
  /** A clean flag to skip update of equipment stat cache. */
  equipmentStatBlockCleanFlag?: true;

  /*** Status Effects ***/

  /** Unconscious status for having CDP >= HP */
  unconscious?: true;
  /** Dead status for having CDP >= MHP */
  dead?: true;
  /** Poison which will cause repeated damage after an initial delay. */
  poison?: {
    damage: number;
    delay: number;
    duration: number;
  };
  /** Regeneration which will cause repeated healing after an initial delay. */
  regeneration?: {
    heal: number;
    delay: number;
    duration: number;
  };
  /** Temporarily boost attack. */
  advantage?: { attack: number; duration: number };
  /** Temporarily boost defense. */
  guard?: { defense: number; duration: number };
  /** Temporarily boost MHP. */
  fortify?: { mhp: number; duration: number };
  /** Status stat cache. */
  statusStatBlock?: StatBlock;
  /** A clean flag to skip update of status stat cache. */
  statusStatBlockCleanFlag?: true;

  /** A clean flag to skip update of total stats. */
  statsCleanFlag?: true;

  /*** Items ***/

  /** Whether this can be taken as an inventory item. */
  takeable?: true;
  /** Stats applied if this is equipped. */
  equippable?: Equippable;
  // /** The action this item takes if consumed. */
  // TODO consumable: Action;
  // /** A seed for deterministic pseudo-random behaviors such as room decorations and randomly-assigned special components. Not used for loot generation because loot shouldn't be predictable (outside of testing). */
  // TODO seed: number;
  // /** Quality of items generated as loot when opened/defeated. */
  // TODO lootQuality: LootQuality;
};

const entityComponentNameSet = new Set<string>([
  "location",
  "allegiance",
] satisfies (keyof Entity)[]);

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
    if (entityComponentNameSet.has(name)) {
      (newEntity as any)[name] = component;
    } else {
      (newEntity as any)[name] = cloneComponent(component);
    }
    return newEntity;
  }, {} as TEntity);
};

type MergedEntity<T extends Entity, U extends Partial<Entity>> = {
  [name in (keyof T | keyof U) & keyof Entity]: Exclude<
    Entity[name],
    undefined
  >;
} & {
  [name in Exclude<keyof Entity, keyof T | keyof U>]: Entity[name];
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
