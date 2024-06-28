import { IWorld, getEntityComponents } from "bitecs";
import {
  AsTsSchema,
  ComponentRegistry,
  SchemaRecord,
  addComponent,
} from "./component";

type EntityIdMark = {};

export type EntityId = number & [EntityIdMark];

export type Entity<TSchemaRecord extends SchemaRecord> = Partial<{
  [key in keyof ComponentRegistry<TSchemaRecord>["schemas"]]: AsTsSchema<
    ComponentRegistry<TSchemaRecord>["schemas"][key]
  >;
}>;

export const writeEntity = <TSchemaRecord extends SchemaRecord>(
  world: IWorld,
  componentRegistry: ComponentRegistry<TSchemaRecord>
) => {
  const finalAddComponent = addComponent(world, componentRegistry);
  return (entityId: EntityId, entity: Entity<TSchemaRecord>): void => {
    for (const key of Object.keys(entity)) {
      if (!(key in componentRegistry.components)) {
        throw new Error(`Entity data has unknown component name: ${key}`);
      }

      const componentName = key as keyof TSchemaRecord;
      const componentData = entity[componentName];
      if (componentData != null) {
        finalAddComponent(componentName, entityId, componentData);
      }
    }
  };
};

export const readEntity = <TSchemaRecord extends SchemaRecord>(
  world: IWorld,
  componentRegistry: ComponentRegistry<TSchemaRecord>
) => {
  type TComponentRecord = typeof componentRegistry.components;
  type TComponentName = keyof TComponentRecord;
  type TComponent = TComponentRecord[TComponentName];
  type TEntity = Entity<TSchemaRecord>;
  type TComponentData = NonNullable<TEntity[keyof TEntity]>;

  const componentNameMap = new Map(
    Object.entries(componentRegistry).map(
      ([key, value]) => [value as TComponent, key as TComponentName] as const
    )
  );

  return (entityId: EntityId): Entity<TSchemaRecord> => {
    const entityData: TEntity = {};
    const components = getEntityComponents(world, entityId);

    for (const untypedComponent of components) {
      const component = untypedComponent as TComponent;
      const name = componentNameMap.get(component);

      if (name == null) {
        continue;
      }

      const componentData: Partial<TComponentData> = {};
      if (name != null) {
        for (const field of Object.keys(
          component
        ) as (keyof TComponentData)[]) {
          componentData[field] = (component as any)[field][entityId];
        }
        entityData[name] = componentData as TComponentData;
      }
    }

    return entityData;
  };
};
