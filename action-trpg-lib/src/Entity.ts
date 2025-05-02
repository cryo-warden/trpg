import type { With } from "miniplex";
import type { Engine } from "./Engine";
import type {
  Resource,
  ResourceActionName,
  ResourceBaselineName,
  ResourceTraitName,
} from "./Resource";
import type { ActionState } from "./structures/ActionState";
import type {
  SequenceController,
  PlayerController,
  AwarenessController,
} from "./structures/Controller";
import type { EntityEvent } from "./structures/EntityEvent";
import type { Equippable } from "./structures/Equippable";
import type { StatBlock } from "./structures/StatBlock";
import type { RoomEntity } from "./structures/Map";

export type Entity<TResource extends Resource<TResource>> = {
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
  /** The names of the actions available to this entity */
  actions?: ResourceActionName<TResource>[];

  /** The action this entity is currently performing */
  actionState?: ActionState<TResource>;

  /** Allegiance to other entities */
  allegiance?: Entity<TResource>;

  /*** Control ***/

  /** Assigns actions from player input */
  playerController?: PlayerController<TResource>;
  /** Assigns actions in sequence */
  sequenceController?: SequenceController;
  /** Assigns actions based on an awareness state */
  awarenessController?: AwarenessController<TResource>;

  /*** Events ***/

  /** Entity change events related to this entity */
  observable?: EntityEvent<TResource>[];
  /** Entity change events which this entity observes */
  observer?: EntityEvent<TResource>[];

  /*** Location and Contents ***/

  /** Another Entity in which this one is located */
  location?: Entity<TResource>;
  /** The name of the map where this entity is currently located */
  locationMapName?: string;
  /** Entities located inside this one */
  contents?: Entity<TResource>[];
  /** A clean flag to skip update of contents */
  contentsCleanFlag?: true;

  /** A path to another location. */
  path?: { destination: Entity<TResource> };

  /** Map Generation Settings */

  /** The name of the map theme this entity uses to generate rooms */
  mapThemeName?: string;
  /** The layout style to generate the rooms for this map */
  mapLayout?: "path" | "hub";
  /** The number of rooms this entity generates to create a main path */
  mapMainPathRoomCount?: number;
  /** The total number of rooms this entity generates */
  mapTotalRoomCount?: number;
  /** The total number of room loops this entity generates */
  mapLoopCount?: number;
  /** The minimum number of decorations this entity generates per room */
  mapMinDecorationCount?: number;
  /** The maximum number of decorations this entity generates per room */
  mapMaxDecorationCount?: number;
  /** The name of the map to attach the main entrance of this one */
  entrypointMapName?: string;
  /** A number indicating the order in which this map should be attached
   * if its entrypoint is a hub; missing an index indicates a random
   * placement between any indexed maps */
  entrypointHubIndex?: number;
  /** List of room entities if the map is currently realized */
  mapRealizedRoomEntities?: RoomEntity<TResource>[];

  /*** Stats ***/

  /** Name of a baseline for building an entity's changeable stats. */
  baseline?: ResourceBaselineName<TResource>;
  /** List of names of traits to alter an entity's changeable stats. */
  traits?: ResourceTraitName<TResource>[];
  /** Traits stat cache. */
  traitsStatBlock?: StatBlock<TResource>;
  /** A clean flag to skip update of trait stat cache. */
  traitsStatBlockCleanFlag?: true;
  /** List of equipped items to alter an entity's changeable stats. */
  equipment?: Entity<TResource>[];
  /** Equipment stat cache. */
  equipmentStatBlock?: StatBlock<TResource>;
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
  statusStatBlock?: StatBlock<TResource>;
  /** A clean flag to skip update of status stat cache. */
  statusStatBlockCleanFlag?: true;

  /** A clean flag to skip update of total stats. */
  statsCleanFlag?: true;

  /*** Items ***/

  /** Whether this can be taken as an inventory item. */
  takeable?: true;
  /** Stats applied if this is equipped. */
  equippable?: Equippable<TResource>;
  // /** The action this item takes if consumed. */
  // TODO consumable: Action;
  /** A seed for deterministic pseudo-random behaviors such as room decorations and randomly-assigned special components. Not used for loot generation because loot shouldn't be predictable (outside of testing). */
  seed?: string;
  // /** Quality of items generated as loot when opened/defeated. */
  // TODO lootQuality: LootQuality;
};

const setComponentNameSet = new Set<string>([
  "observer",
] satisfies (keyof Entity<any>)[]);

const entityComponentNameSet = new Set<string>([
  "location",
  "allegiance",
] satisfies (keyof Entity<any>)[]);

export const cloneComponent = <T>(component: T): T =>
  Array.isArray(component)
    ? ([...component] as any)
    : component === Object(component)
    ? { ...component }
    : component;

export const cloneEntity = <
  const TResource extends Resource<TResource>,
  const TEntity extends Entity<TResource>
>(
  entity: TEntity
): TEntity => {
  return Object.entries(entity).reduce((newEntity, [name, component]) => {
    if (entityComponentNameSet.has(name)) {
      (newEntity as any)[name] = component;
    } else if (setComponentNameSet.has(name)) {
      (newEntity as any)[name] = new Set(component as any);
    } else {
      (newEntity as any)[name] = cloneComponent(component);
    }
    return newEntity;
  }, {} as TEntity);
};

type MergedEntity<
  TResource extends Resource<TResource>,
  T extends Entity<TResource>,
  U extends Partial<Entity<TResource>>
> = {
  [name in (keyof T | keyof U) & keyof Entity<TResource>]: Exclude<
    Entity<TResource>[name],
    undefined
  >;
} & {
  [name in Exclude<
    keyof Entity<TResource>,
    keyof T | keyof U
  >]: Entity<TResource>[name];
};

export const mergeEntity = <
  const TResource extends Resource<TResource>,
  const TEntityA extends With<Entity<TResource>, any>,
  const TEntityB extends Partial<Entity<TResource>>
>(
  a: TEntityA,
  b: TEntityB
): MergedEntity<TResource, TEntityA, TEntityB> => {
  return Object.entries(b).reduce((a, [name, component]) => {
    if (entityComponentNameSet.has(name)) {
      (a as any)[name] = component;
    } else if (setComponentNameSet.has(name)) {
      (a as any)[name] = new Set(component as any);
    } else {
      (a as any)[name] = cloneComponent(component);
    }
    return a;
  }, cloneEntity(a as any)) as any;
};

export const createEntityFactory =
  <
    const TResource extends Resource<TResource>,
    const TBaseEntity extends With<Entity<TResource>, any>
  >(
    _engine: Engine<TResource>,
    baseEntity: TBaseEntity
  ) =>
  <const TCustomFields extends Partial<Entity<TResource>>>(
    customFields: TCustomFields
  ): MergedEntity<TResource, TBaseEntity, TCustomFields> =>
    mergeEntity(baseEntity, customFields);
export type EngineEntity<TEngine> = TEngine extends Engine<infer TResource>
  ? Entity<TResource>
  : never;
