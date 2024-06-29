import { AsBitEcsType, AsTsType, Types, asBitEcsType } from "./types";

export type Schema = { [key: string]: Types };

export type AsBitEcsSchema<TSchema extends Schema> = {
  [key in keyof TSchema]: AsBitEcsType<TSchema[key]>;
};

export const asBitEcsSchema = <TSchema extends Schema>(
  schema: TSchema
): AsBitEcsSchema<TSchema> => {
  const result: Partial<AsBitEcsSchema<Schema>> = {};
  for (const key of Object.keys(schema)) {
    result[key] = asBitEcsType(schema[key]);
  }
  return result as AsBitEcsSchema<TSchema>;
};

export type SchemaRecord = Readonly<{ [key: string]: Schema }>;

export type AsTsSchema<TSchema extends Schema> = {
  [key in keyof TSchema]: AsTsType<TSchema[key]>;
};
