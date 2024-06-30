import { Types } from "./types";

export type Schema = { [key: string]: Types };

export type SchemaRecord = Readonly<{ [key: string]: Schema }>;

export type AsTsSchema<TSchema extends Schema> = {
  [key in keyof TSchema]: number;
};
