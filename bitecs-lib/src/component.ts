import { ComponentType, defineComponent } from "bitecs";
import { EntityId } from "./entity";
import { AsTsSchema, Schema, SchemaRecord, asBitEcsSchema } from "./schema";
import { AsBitEcsType } from "./types";

export type Component<TSchema extends Schema> = ComponentType<{
  [key in keyof TSchema]: AsBitEcsType<TSchema[key]>;
}>;

export type ComponentRegistry<TSchemaRecord extends SchemaRecord> = {
  components: {
    [name in keyof TSchemaRecord]: Component<TSchemaRecord[name]>;
  };
  schemas: {
    [name in keyof TSchemaRecord]: TSchemaRecord[name];
  };
};

export const createComponentRegistry = <TSchemaRecord extends SchemaRecord>(
  schemaRecord: TSchemaRecord
): ComponentRegistry<TSchemaRecord> => {
  return {
    components: Object.keys(schemaRecord).reduce((result, name) => {
      result[name as keyof TSchemaRecord] = defineComponent(
        asBitEcsSchema(schemaRecord[name as keyof TSchemaRecord])
      );
      return result;
    }, {} as ComponentRegistry<TSchemaRecord>["components"]),
    schemas: Object.keys(schemaRecord).reduce((result, name) => {
      result[name as keyof TSchemaRecord] =
        schemaRecord[name as keyof TSchemaRecord];
      return result;
    }, {} as ComponentRegistry<TSchemaRecord>["schemas"]),
  };
};

export const readComponent =
  <TSchemaRecord extends SchemaRecord>(
    componentRegistry: ComponentRegistry<TSchemaRecord>
  ) =>
  <TComponentName extends keyof TSchemaRecord>(
    entityId: EntityId,
    componentName: TComponentName
  ): AsTsSchema<TSchemaRecord[TComponentName]> => {
    type TComponent = Component<TSchemaRecord[TComponentName]>;
    type TComponentData = AsTsSchema<TSchemaRecord[TComponentName]>;

    const component: TComponent = componentRegistry.components[componentName];

    const componentData: Partial<TComponentData> = {};
    for (const field of Object.keys(component) as (keyof TComponentData)[]) {
      // WIP Refer to schema to add enum and boolean conversions.
      componentData[field] = (component as any)[field][entityId];
    }

    return componentData as TComponentData;
  };

export const writeComponent =
  <TSchemaRecord extends SchemaRecord>(
    componentRegistry: ComponentRegistry<TSchemaRecord>
  ) =>
  <TComponentName extends keyof TSchemaRecord>(
    entityId: EntityId,
    componentName: TComponentName,
    data: AsTsSchema<TSchemaRecord[TComponentName]>
  ) => {
    const schema: TSchemaRecord[TComponentName] =
      componentRegistry.schemas[componentName];
    const component: Component<TSchemaRecord[TComponentName]> =
      componentRegistry.components[componentName];

    for (const key of Object.keys(data) as (keyof typeof data)[]) {
      if (!(key in schema)) {
        throw new Error(`Unknown field name: ${String(key)}`);
      }

      // WIP Correctly convert enum and boolean to number.
      (component[key] as any)[entityId] = Number(data[key]);
    }
  };
