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
  : T extends readonly [infer U]
  ? Schema<U>[]
  : T extends []
  ? []
  : T extends [infer U, ...infer V]
  ? [Schema<U>, ...Schema<V>]
  : T extends Record<any, any>
  ? {
      -readonly [key in keyof T]: Schema<T[key]>;
    }
  : unknown;
