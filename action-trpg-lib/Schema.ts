export type Schema<T> = T extends true
  ? true
  : T extends false
  ? false
  : T extends "number"
  ? number
  : T extends "string"
  ? string
  : T extends "boolean"
  ? boolean
  : T extends []
  ? []
  : T extends {}
  ? {
      [key in keyof T]: Schema<T[key]>;
    }
  : unknown;
