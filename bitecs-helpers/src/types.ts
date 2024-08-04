import { ComponentType, ISchema, ListType } from "bitecs";

export type EntityId = number & ["ENTITY_ID_MARK"];

export type ComponentRecord<
  TSchemaRecord extends Readonly<Record<string, ISchema>> = {}
> = {
  [key in keyof TSchemaRecord]: ComponentType<TSchemaRecord[key]>;
};

export type TsComponent<TComponent> = {
  [key in keyof TComponent]: TComponent extends ComponentType<infer TSchema>
    ? key extends keyof TSchema
      ? TSchema[key] extends ListType
        ? number[]
        : TSchema[key] extends ISchema
        ? TsComponent<ComponentType<TSchema[key]>>
        : number
      : never
    : never;
};
