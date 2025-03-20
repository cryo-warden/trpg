import type { Schema } from "../Schema";
import { createStatBlock, type StatBlock } from "./StatBlock";

export const statusEffectSchema = {
  /** Unconscious status for having CDP >= HP */
  unconscious: true,
  /** Dead status for having CDP >= MHP */
  dead: true,
  /** Poison which will cause repeated damage after an initial delay. */
  poison: {
    damage: "number",
    delay: "number",
    duration: "number",
  },
  /** Temporarily boost attack. */
  advantage: { attack: "number", duration: "number" },
  /** Temporarily boost defense. */
  guard: { defense: "number", duration: "number" },
  /** Temporarily boost MHP. */
  fortify: { mhp: "number", duration: "number" },
} as const satisfies {
  [key: string]: Schema<any>;
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
  -readonly [name in keyof AllStatusEffectMap]?: AllStatusEffectMap[name];
};

export const combineStatusEffects: {
  [key in keyof AllStatusEffectMap]: (
    first: AllStatusEffectMap[key],
    additive: AllStatusEffectMap[key]
  ) => AllStatusEffectMap[key];
} = {
  unconscious: (_, additive) => additive,
  dead: (_, additive) => additive,
  poison: (base, additive) => ({
    damage: Math.max(base.damage, additive.damage),
    duration: base.duration + additive.duration,
    delay: Math.max(base.delay, additive.delay),
  }),
  advantage: (base, additive) => ({
    attack: Math.max(base.attack, additive.attack),
    duration: Math.max(base.duration, additive.duration),
  }),
  guard: (base, additive) => ({
    defense: Math.max(base.defense, additive.defense),
    duration: Math.max(base.duration, additive.duration),
  }),
  fortify: (base, additive) => ({
    mhp: Math.max(base.mhp, additive.mhp),
    duration: Math.max(base.duration, additive.duration),
  }),
} as const;

export const mergeStatusEffectMap = (
  target: StatusEffectMap,
  source: StatusEffectMap
): void => {
  for (const key of statusEffectNames) {
    if (source[key] == null) {
      continue;
    }

    if (target[key] != null) {
      (target as any)[key] = combineStatusEffects[key](
        (target as any)[key],
        (source as any)[key]
      );
    } else {
      (target as any)[key] =
        source[key] === Object(source[key])
          ? { ...(source as any)[key] }
          : source[key];
    }
  }
};

export const createStatusStatBlock = (
  statusEffectMap: StatusEffectMap
): StatBlock => {
  const attack = statusEffectMap.advantage?.attack ?? 0;
  const defense = statusEffectMap.guard?.defense ?? 0;
  const mhp = statusEffectMap.fortify?.mhp ?? 0;
  return createStatBlock({ mhp, attack, defense });
};
