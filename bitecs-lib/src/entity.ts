import { IWorld, addComponent, getEntityComponents } from "bitecs";
import {
  Component,
  ComponentRegistry,
  readComponent,
  writeComponent,
} from "./component";
import { AsTsSchema, SchemaRecord } from "./schema";

type EntityIdMark = {};

export type EntityId = number & [EntityIdMark];

export type Entity<TSchemaRecord extends SchemaRecord> = Partial<{
  [key in keyof ComponentRegistry<TSchemaRecord>["schemas"]]: AsTsSchema<
    ComponentRegistry<TSchemaRecord>["schemas"][key]
  >;
}>;

export const readEntity = <TSchemaRecord extends SchemaRecord>(
  world: IWorld,
  componentRegistry: ComponentRegistry<TSchemaRecord>
) => {
  type TComponentRecord = typeof componentRegistry.components;

  const componentNameMap = new Map<
    TComponentRecord[keyof TComponentRecord],
    keyof TComponentRecord
  >(
    Object.entries(componentRegistry.components).map(
      ([key, value]) => [value, key] as const
    )
  );

  const readWorldComponent = readComponent(componentRegistry);

  return (entityId: EntityId): Entity<TSchemaRecord> => {
    const entityData: Entity<TSchemaRecord> = {};
    const components = getEntityComponents(world, entityId) as Component<
      TSchemaRecord[keyof TSchemaRecord]
    >[];

    for (const component of components) {
      const name = componentNameMap.get(component);

      if (name != null) {
        entityData[name] = readWorldComponent(entityId, name);
      }
    }

    return entityData;
  };
};

export const writeEntity = <TSchemaRecord extends SchemaRecord>(
  world: IWorld,
  componentRegistry: ComponentRegistry<TSchemaRecord>
) => {
  const writeWorldComponent = writeComponent(componentRegistry);
  return (entityId: EntityId, entity: Entity<TSchemaRecord>): void => {
    for (const key of Object.keys(entity)) {
      if (!(key in componentRegistry.components)) {
        throw new Error(`Entity data has unknown component name: ${key}`);
      }

      const componentName = key as keyof TSchemaRecord;
      const componentData = entity[componentName];
      if (componentData != null) {
        const component = componentRegistry.components[componentName];
        addComponent(world, component, entityId);
        writeWorldComponent(entityId, componentName, componentData);
      }
    }
  };
};
