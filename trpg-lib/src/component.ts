import { ComponentType, defineComponent, Types as BitEcsTypes } from "bitecs";

type BitEcsTypes = (typeof BitEcsTypes)[keyof typeof BitEcsTypes];

export const Types = {
  ...BitEcsTypes,
  number: "number",
  enum: "enum",
  boolean: "boolean",
} as const;

export type Types = (typeof Types)[keyof typeof Types];

export type Schema = { [key: string]: Types };

export type ComponentSpec<TSchema extends Schema> = {
  name: string;
  schema: TSchema;
};

export type ComponentRegistration<TSchema extends Schema> = {
  name: string;
  schema: TSchema;
  component: ComponentType<AsBitEcsSchema<TSchema>>;
};

type AsBitEcsType<T extends Types> = T extends BitEcsTypes
  ? T
  : T extends typeof Types.number
  ? typeof BitEcsTypes.f64
  : T extends typeof Types.enum | typeof Types.boolean
  ? typeof BitEcsTypes.ui8
  : never;

const asBitEcsType = (type: Types) => {
  if (type in BitEcsTypes) {
    return type as BitEcsTypes;
  }

  switch (type) {
    case Types.number:
      return BitEcsTypes.f64;
    case Types.enum:
    case Types.boolean:
      return BitEcsTypes.ui8;
  }

  throw new Error(`Unsupported type: ${type}`);
};

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

export type ComponentSpecNames<TComponentSpec extends ComponentSpec<Schema>> =
  TComponentSpec["name"];

export type ComponentSpecByName<
  TComponentSpecs extends readonly ComponentSpec<Schema>[],
  TName extends string
> = Extract<TComponentSpecs[number], { name: TName }>;

export type ComponentRegistry<
  TComponentSpecs extends readonly ComponentSpec<Schema>[]
> = {
  [name in ComponentSpecNames<TComponentSpecs[number]>]: ComponentRegistration<
    ComponentSpecByName<TComponentSpecs, name>["schema"]
  >;
};

export const createComponentRegistry = <
  TComponentSpecs extends readonly ComponentSpec<Schema>[]
>(
  specs: TComponentSpecs
): ComponentRegistry<TComponentSpecs> => {
  return specs.reduce((result, spec) => {
    (result as any)[spec.name] = {
      name: spec.name,
      schema: spec.schema,
      component: defineComponent(asBitEcsSchema(spec.schema)),
    };
    return result;
  }, {} as ComponentRegistry<TComponentSpecs>);
};

export type AsTsType<T extends Types> = T extends typeof Types.enum
  ? string
  : T extends typeof Types.boolean
  ? boolean
  : number;

export type AsTsSchema<TSchema extends Schema> = {
  [key in keyof TSchema]: AsTsType<TSchema[key]>;
};
