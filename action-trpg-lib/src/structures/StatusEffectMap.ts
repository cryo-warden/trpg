import type { Schema } from "../Schema";

export const statusEffectSchema = {
  /** Unconscious status for having CDP >= HP */
  unconscious: true,
  /** Dead status for having CDP >= MHP */
  dead: true,
} as const satisfies {
  [key in string]: Schema<unknown>;
};

export const statusEffectNames = Object.keys(
  statusEffectSchema
) as (keyof typeof statusEffectSchema)[];

export type AllStatusEffectMap = {
  [name in keyof typeof statusEffectSchema]: Schema<
    (typeof statusEffectSchema)[name]
  >;
};

export type StatusEffectMap = {
  -readonly [name in keyof AllStatusEffectMap]?: Schema<
    AllStatusEffectMap[name]
  >;
};

export const combineStatusEffects: {
  [key in keyof AllStatusEffectMap]: (
    first: AllStatusEffectMap[key],
    additive: AllStatusEffectMap[key]
  ) => AllStatusEffectMap[key];
} = {
  unconscious: (_, additive) => additive,
  dead: (_, additive) => additive,
} as const;
