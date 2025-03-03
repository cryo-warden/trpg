import type {
  Actor,
  CDPTracker,
  CriticalDamageTaker,
  DamageTaker,
  EPTracker,
  HealingTaker,
  HPTracker,
  StatusTracker,
} from "./components/Actor";

export type Entity = Partial<{
  damageTaker: DamageTaker;
  criticalDamageTaker: CriticalDamageTaker;
  healingTaker: HealingTaker;
  hpTracker: HPTracker;
  cdpTracker: CDPTracker;
  epTracker: EPTracker;
  statusTracker: StatusTracker;
  actor: Actor;
}>;

export type EntityWithComponents<TComponentNames extends (keyof Entity)[]> =
  Entity & {
    [key in TComponentNames[number]]-?: Exclude<Entity[key], undefined>;
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

export const cloneEntity = <TEntity extends EntityWithComponents<any>>(
  entity: TEntity
): TEntity => {
  return Object.entries(entity).reduce((newEntity, [name, component]) => {
    (newEntity as any)[name] = { ...component };
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
    (a as any)[name] = { ...component };
    return a;
  }, cloneEntity(a)) as any;
};

export const createEntityFactory =
  <TBaseEntity extends EntityWithComponents<any>>(baseEntity: TBaseEntity) =>
  <TCustomFields extends EntityWithComponents<any>>(
    customFields: TCustomFields
  ): MergedEntity<TBaseEntity, TCustomFields> =>
    mergeEntity(baseEntity, customFields);
