import type { Engine } from "../Engine";
import type { Entity } from "../Entity";
import { createStatBlock, type StatBlock } from "./StatBlock";

export const statusEffectNames = [
  "poison",
  "regeneration",
  "advantage",
  "guard",
  "fortify",
] as const satisfies (keyof Entity)[];

export type StatusEffectComponents = {
  [key in (typeof statusEffectNames)[number]]: NonNullable<Entity[key]>;
};

export type StatusEffectMap = Partial<StatusEffectComponents>;

export const combineStatusEffects: {
  [key in keyof StatusEffectComponents]: (
    base: StatusEffectComponents[key],
    additive: StatusEffectComponents[key]
  ) => StatusEffectComponents[key];
} = {
  poison: (base, additive) => ({
    damage: Math.max(base.damage, additive.damage),
    duration: base.duration + additive.duration,
    delay: Math.max(base.delay, additive.delay),
  }),
  regeneration: (base, additive) => ({
    heal: Math.max(base.heal, additive.heal),
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

export const applyStatusEffectMap = (
  engine: Engine,
  entity: Entity,
  statusEffectMap: StatusEffectMap
): void => {
  for (const key of statusEffectNames) {
    if (statusEffectMap[key] == null) {
      continue;
    }

    if (entity[key] != null) {
      (entity as any)[key] = combineStatusEffects[key](
        (entity as any)[key],
        (statusEffectMap as any)[key]
      );
    } else {
      engine.world.addComponent(
        entity,
        key,
        statusEffectMap[key] === Object(statusEffectMap[key])
          ? { ...(statusEffectMap as any)[key] }
          : statusEffectMap[key]
      );
    }
    engine.world.removeComponent(entity, "statusStatBlockCleanFlag");
  }
};

export const createStatusStatBlock = (entity: Entity): StatBlock => {
  const attack = entity.advantage?.attack ?? 0;
  const defense = entity.guard?.defense ?? 0;
  const mhp = entity.fortify?.mhp ?? 0;
  return createStatBlock({ mhp, attack, defense });
};
