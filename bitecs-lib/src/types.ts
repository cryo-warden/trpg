import { Types as BitEcsTypes } from "bitecs";

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

export type AsBitEcsType<T extends Types> = T extends BitEcsTypes
  ? T
  : T extends typeof Types.number
  ? typeof BitEcsTypes.f64
  : T extends typeof Types.enum | typeof Types.boolean
  ? typeof BitEcsTypes.ui8
  : never;

export const asBitEcsType = <T extends Types>(type: T): AsBitEcsType<T> => {
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

export type AsTsType<T extends Types> = T extends typeof Types.enum
  ? string
  : T extends typeof Types.boolean
  ? boolean
  : number;
