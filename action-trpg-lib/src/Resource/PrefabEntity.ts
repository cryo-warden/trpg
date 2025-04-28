import type { Resource, ResourcePrefabEntityRecord } from ".";
import type { Entity } from "../Entity";

export type PrefabEntity<TResource extends Resource<TResource>> =
  Entity<TResource>;

export const createPrefabEntity = <
  const TResource extends Resource<TResource>,
  const TName extends string,
  const TCustomFields extends Partial<PrefabEntity<TResource>>
>(
  name: TName,
  customFields: TCustomFields
) =>
  ({
    name,
    ...customFields,
  } satisfies PrefabEntity<TResource>);

export type PrefabEntityRecord<
  TResource extends Resource<TResource>,
  TPrefabEntities extends PrefabEntity<TResource>[] = PrefabEntity<TResource>[]
> = {
  [name in TPrefabEntities[number]["name"]]: Extract<
    TPrefabEntities[number],
    { name: name }
  >;
};

export const createPrefabEntityRecord = <
  const TResource extends Resource<TResource>,
  const T extends PrefabEntity<TResource>[]
>(
  prefabEntities: T
): PrefabEntityRecord<TResource, T> =>
  prefabEntities.reduce((result, prefabEntity) => {
    result[prefabEntity.name] = prefabEntity;
    return result;
  }, {} as any);

export type ResourcePrefabEntityName<TResource extends Resource<TResource>> =
  string & keyof ResourcePrefabEntityRecord<TResource>;
