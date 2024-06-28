import {
  ComponentType,
  defineComponent,
  Types as BitEcsTypes,
  addComponent as bitEcsAddComponent,
  removeComponent as bitEcsRemoveComponent,
  IWorld,
} from "bitecs";
import { EntityId } from "./entity";

type ValueOf<T> = T[keyof T];

const ExtensionTypes = {
  number: "number",
  enum: "enum",
  boolean: "boolean",
} as const;

export const Types = {
  ...BitEcsTypes,
  ...ExtensionTypes,
} as const;

type BitEcsTypes = ValueOf<typeof BitEcsTypes>;

export type Types = ValueOf<typeof Types>;

type AsBitEcsType<T extends Types> = T extends BitEcsTypes
  ? T
  : T extends typeof Types.number
  ? typeof BitEcsTypes.f64
  : T extends typeof Types.enum | typeof Types.boolean
  ? typeof BitEcsTypes.ui8
  : never;

const asBitEcsType = <T extends Types>(type: T): AsBitEcsType<T> => {
  if (type in BitEcsTypes) {
    return type as AsBitEcsType<T>;
  }

  switch (type) {
    case Types.number:
      return BitEcsTypes.f64 as AsBitEcsType<T>;
    case Types.enum:
    case Types.boolean:
      return BitEcsTypes.ui8 as AsBitEcsType<T>;
  }

  throw new Error(`Unsupported type: ${type}`);
};

type Schema = { [key: string]: Types };

type AsBitEcsSchema<TSchema extends Schema> = {
  [key in keyof TSchema]: AsBitEcsType<TSchema[key]>;
};

const asBitEcsSchema = <TSchema extends Schema>(
  schema: TSchema
): AsBitEcsSchema<TSchema> => {
  const result: Partial<AsBitEcsSchema<Schema>> = {};
  for (const key of Object.keys(schema)) {
    result[key] = asBitEcsType(schema[key]);
  }
  return result as AsBitEcsSchema<TSchema>;
};

export type Component<TSchema extends Schema> = ComponentType<{
  [key in keyof TSchema]: AsBitEcsType<TSchema[key]>;
}>;

export type SchemaRecord = Readonly<{ [key: string]: Schema }>;

export const addComponent =
  <TSchemaRecord extends SchemaRecord>(
    world: IWorld,
    componentRegistry: ComponentRegistry<TSchemaRecord>
  ) =>
  <TComponentName extends keyof TSchemaRecord>(
    componentName: TComponentName,
    entityId: EntityId,
    data: AsTsSchema<TSchemaRecord[TComponentName]>
  ) => {
    const schema: TSchemaRecord[TComponentName] =
      componentRegistry.schemas[componentName];
    const component: Component<TSchemaRecord[TComponentName]> =
      componentRegistry.components[componentName];

    bitEcsAddComponent(world, component, entityId);

    for (const key of Object.keys(data)) {
      if (!(key in schema)) {
        throw new Error(`Unknown field name: ${key}`);
      }
      // WIP Convert enum and boolean to number.
      (component[key] as any)[entityId] = Number(data[key]);
    }
  };

export const removeComponent =
  <TSchemaRecord extends SchemaRecord>(
    world: IWorld,
    componentRegistry: ComponentRegistry<TSchemaRecord>
  ) =>
  <TComponentName extends keyof ComponentRegistry<TSchemaRecord>>(
    componentName: TComponentName,
    entityId: EntityId
  ) => {
    bitEcsRemoveComponent(world, componentRegistry[componentName], entityId);
  };

export const readComponent = <
  TSchemaRecord extends SchemaRecord,
  TComponentName extends keyof ComponentRegistry<TSchemaRecord>
>(
  world: IWorld,
  componentRegistry: ComponentRegistry<TSchemaRecord>,
  componentName: TComponentName,
  entityId: EntityId
) => {
  bitEcsRemoveComponent(world, componentRegistry[componentName], entityId);
};

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

export type AsTsType<T extends Types> = T extends typeof Types.enum
  ? string
  : T extends typeof Types.boolean
  ? boolean
  : number;

export type AsTsSchema<TSchema extends Schema> = {
  [key in keyof TSchema]: AsTsType<TSchema[key]>;
};
