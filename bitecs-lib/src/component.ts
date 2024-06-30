import { ComponentType, defineComponent } from "bitecs";
import { EntityId } from "./entity";
import { AsTsSchema, Schema, SchemaRecord } from "./schema";

export type Component<TSchema extends Schema> = ComponentType<TSchema> & {
  [field in keyof TSchema]: number[];
};

export type ComponentRecord<TSchemaRecord extends SchemaRecord> = {
  [name in keyof TSchemaRecord]: Component<TSchemaRecord[name]>;
};

const componentCache = new WeakMap<Schema, Component<Schema>>();

export const asComponent = <TSchema extends Schema>(
  schema: TSchema
): Component<TSchema> => {
  if (!componentCache.has(schema)) {
    componentCache.set(schema, defineComponent(schema) as Component<TSchema>);
  }
  return componentCache.get(schema) as Component<TSchema>;
};

export const asComponentRecord = <TSchemaRecord extends SchemaRecord>(
  schemaRecord: TSchemaRecord
): ComponentRecord<TSchemaRecord> => {
  const names: (keyof TSchemaRecord)[] = Object.keys(schemaRecord);
  return names.reduce((result, name) => {
    result[name] = asComponent(schemaRecord[name]);
    return result;
  }, {} as ComponentRecord<TSchemaRecord>);
};

export const readComponent =
  <TSchemaRecord extends SchemaRecord>(
    componentRecord: ComponentRecord<TSchemaRecord>
  ) =>
  <TComponentName extends keyof TSchemaRecord>(
    entityId: EntityId,
    componentName: TComponentName
  ): AsTsSchema<TSchemaRecord[TComponentName]> => {
    const component = componentRecord[componentName];

    const componentData: Partial<AsTsSchema<TSchemaRecord[TComponentName]>> =
      {};

    for (const field of Object.keys(component) as (keyof typeof component)[]) {
      componentData[field as keyof typeof componentData] =
        component[field][entityId];
    }

    return componentData as AsTsSchema<TSchemaRecord[TComponentName]>;
  };

export const writeComponent =
  <TSchemaRecord extends SchemaRecord>(
    componentRecord: ComponentRecord<TSchemaRecord>
  ) =>
  <TComponentName extends keyof TSchemaRecord>(
    entityId: EntityId,
    componentName: TComponentName,
    data: AsTsSchema<TSchemaRecord[TComponentName]>
  ) => {
    const component = componentRecord[componentName];

    for (const key of Object.keys(data) as (keyof typeof data)[]) {
      if (!(key in component)) {
        throw new Error(`Unknown field name: ${String(key)}`);
      }

      component[key][entityId] = data[key];
    }
  };
