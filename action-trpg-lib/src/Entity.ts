import type { DamageTaker } from "./components/DamageTaker";
import type { CriticalDamageTaker } from "./components/CriticalDamageTaker";
import type { HealingTaker } from "./components/HealingTaker";
import type { HP } from "./components/HP";
import type { MHP } from "./components/MHP";
import type { CDP } from "./components/CDP";
import type { EP } from "./components/EP";
import type { MEP } from "./components/MEP";
import type { Status } from "./components/Status";
import type { Actor } from "./components/Actor";
import type { Observer } from "./components/Observer";
import type { Observable } from "./components/Observable";

export type Entity = {
  damageTaker?: DamageTaker;
  criticalDamageTaker?: CriticalDamageTaker;
  healingTaker?: HealingTaker;
  hp?: HP;
  mhp?: MHP;
  cdp?: CDP;
  ep?: EP;
  mep?: MEP;
  status?: Status;
  actor?: Actor;
  observer?: Observer;
  observable?: Observable;
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
