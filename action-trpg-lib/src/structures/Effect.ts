import type { Entity } from "../Entity";
import type { Factory } from "../functional/factory";
import type { StatusEffectMap } from "./StatusEffectMap";

export type Intensity = "normal" | "powerful" | "extreme";

export type Buff =
  | { type: "heal"; heal: number }
  | { type: "status"; statusEffectMap: StatusEffectMap };

export type RestEffect = {
  type: "rest";
  intensity: Intensity;
};

export type AttackEffect = {
  type: "attack";
  intensity: Intensity;
  /** Damage inflicted by the attack. */
  damage: number;
  /** Critical Damage inflicted inherently by the attack. */
  criticalDamage: number;
  /** Map of status effects applied by the attack. */
  statusEffectMap?: StatusEffectMap;
};

export type BuffEffect = {
  type: "buff";
  intensity: Intensity;
  buff: Buff;
};

export type MoveEffect = {
  type: "move";
};

export type TakeEffect = {
  type: "take";
};

export type DropEffect = {
  type: "drop";
};

export type EquipEffect = {
  type: "equip";
  intensity: Intensity;
};

export type UnequipEffect = {
  type: "unequip";
  intensity: Intensity;
};

export type Effect =
  | RestEffect
  | AttackEffect
  | BuffEffect
  | MoveEffect
  | TakeEffect
  | DropEffect
  | EquipEffect
  | UnequipEffect;

export const validateEffect = (
  effect: Effect,
  entity: Entity,
  target: Entity
) => {
  if (target.location !== entity.location && target.location !== entity) {
    return false;
  }

  switch (effect.type) {
    case "attack":
      return (
        target.hp != null &&
        entity !== target &&
        (target.allegiance == null || target.allegiance !== entity.allegiance)
      );
    case "buff":
      return (
        target.hp != null &&
        (entity === target ||
          (target.allegiance != null &&
            target.allegiance === entity.allegiance))
      );
    case "drop":
      return (
        target.takeable &&
        entity.contents?.includes(target) &&
        !entity.equipment?.includes(target)
      );
    case "equip":
      return (
        target.equippable != null &&
        !entity.equipment?.includes(target) &&
        entity.contents?.includes(target)
      );
    case "move":
      return target.path != null;
    case "rest":
      return true;
    case "take":
      return target.takeable && !entity.contents?.includes(target);
    case "unequip":
      return target.equippable != null && entity.equipment?.includes(target);
  }
};

const createBuffEffect = (intensity: Intensity, buff: Buff): BuffEffect => ({
  type: "buff",
  intensity,
  buff,
});

export const buffEffect = {
  normalHeal: (heal: number) =>
    createBuffEffect("normal", { type: "heal", heal }),
  powerfulHeal: (heal: number) =>
    createBuffEffect("powerful", { type: "heal", heal }),
  extremeHeal: (heal: number) =>
    createBuffEffect("extreme", { type: "heal", heal }),

  normalStatus: (statusEffectMap: StatusEffectMap) =>
    createBuffEffect("normal", { type: "status", statusEffectMap }),
  powerfulStatus: (statusEffectMap: StatusEffectMap) =>
    createBuffEffect("powerful", { type: "status", statusEffectMap }),
  extremeStatus: (statusEffectMap: StatusEffectMap) =>
    createBuffEffect("extreme", { type: "status", statusEffectMap }),
} as const satisfies Record<string, BuffEffect | Factory<BuffEffect>>;

export const effect = {
  move: { type: "move" },

  take: { type: "take" },
  drop: { type: "drop" },

  normalEquip: { type: "equip", intensity: "normal" },
  powerfulEquip: { type: "equip", intensity: "powerful" },
  extremeEquip: { type: "equip", intensity: "extreme" },
  normalUnequip: { type: "unequip", intensity: "normal" },
  powerfulUnequip: { type: "unequip", intensity: "powerful" },
  extremeUnequip: { type: "unequip", intensity: "extreme" },

  normalRest: { type: "rest", intensity: "normal" },
  powerfulRest: { type: "rest", intensity: "powerful" },
  extremeRest: { type: "rest", intensity: "extreme" },

  normalAttack: (damage: number, criticalDamage: number = 0): AttackEffect => ({
    type: "attack",
    intensity: "normal",
    damage,
    criticalDamage,
  }),
  powerfulAttack: (
    damage: number,
    criticalDamage: number = 0
  ): AttackEffect => ({
    type: "attack",
    intensity: "powerful",
    damage,
    criticalDamage,
  }),
  extremeAttack: (
    damage: number,
    criticalDamage: number = 0
  ): AttackEffect => ({
    type: "attack",
    intensity: "extreme",
    damage,
    criticalDamage,
  }),
  normalStatusAttack: (
    statusEffectMap: StatusEffectMap,
    damage: number = 0,
    criticalDamage: number = 0
  ): AttackEffect => ({
    type: "attack",
    intensity: "normal",
    damage,
    criticalDamage,
    statusEffectMap,
  }),
  powerfulStatusAttack: (
    statusEffectMap: StatusEffectMap,
    damage: number = 0,
    criticalDamage: number = 0
  ): AttackEffect => ({
    type: "attack",
    intensity: "powerful",
    damage,
    criticalDamage,
    statusEffectMap,
  }),
  extremeStatusAttack: (
    statusEffectMap: StatusEffectMap,
    damage: number = 0,
    criticalDamage: number = 0
  ): AttackEffect => ({
    type: "attack",
    intensity: "extreme",
    damage,
    criticalDamage,
    statusEffectMap,
  }),
} as const satisfies Record<string, Effect | Factory<Effect>>;
