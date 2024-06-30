import { IWorld, addComponent, getEntityComponents } from "bitecs";
import {
  Component,
  ComponentRecord,
  readComponent,
  writeComponent,
} from "./component";
import { AsTsSchema, SchemaRecord } from "./schema";

type EntityIdMark = {};

export type EntityId = number & [EntityIdMark];

export type Entity<TSchemaRecord extends SchemaRecord> = {
  [key in keyof TSchemaRecord]?: AsTsSchema<TSchemaRecord[key]>;
};

export const readEntity = <TSchemaRecord extends SchemaRecord>(
  world: IWorld,
  componentRecord: ComponentRecord<TSchemaRecord>
) => {
  type TComponentRecord = typeof componentRecord;

  const componentNameMap = new Map<
    TComponentRecord[keyof TComponentRecord],
    keyof TComponentRecord
  >(Object.entries(componentRecord).map(([key, value]) => [value, key]));

  const readWorldComponent = readComponent(componentRecord);

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
  componentRecord: ComponentRecord<TSchemaRecord>
) => {
  const writeWorldComponent = writeComponent(componentRecord);
  return (entityId: EntityId, entity: Entity<TSchemaRecord>): void => {
    for (const key of Object.keys(entity)) {
      if (!(key in componentRecord)) {
        throw new Error(`Entity data has unknown component name: ${key}`);
      }

      const componentName = key as keyof TSchemaRecord;
      const componentData = entity[componentName];
      if (componentData != null) {
        const component = componentRecord[componentName];
        addComponent(world, component, entityId);
        writeWorldComponent(entityId, componentName, componentData);
      }
    }
  };
};
