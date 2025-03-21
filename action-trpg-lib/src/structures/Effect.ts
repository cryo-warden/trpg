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
  status?: StatusEffectMap;
};

export type BuffEffect = {
  type: "buff";
  intensity: Intensity;
  buff: Buff;
};

export type MoveEffect = {
  type: "move";
};

export type EquipEffect = {
  type: "equip";
  intensity: Intensity;
};

export type Effect =
  | RestEffect
  | AttackEffect
  | BuffEffect
  | MoveEffect
  | EquipEffect;

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
    status: StatusEffectMap,
    damage: number = 0,
    criticalDamage: number = 0
  ): AttackEffect => ({
    type: "attack",
    intensity: "normal",
    damage,
    criticalDamage,
    status,
  }),
  powerfulStatusAttack: (
    status: StatusEffectMap,
    damage: number = 0,
    criticalDamage: number = 0
  ): AttackEffect => ({
    type: "attack",
    intensity: "powerful",
    damage,
    criticalDamage,
    status,
  }),
  extremeStatusAttack: (
    status: StatusEffectMap,
    damage: number = 0,
    criticalDamage: number = 0
  ): AttackEffect => ({
    type: "attack",
    intensity: "extreme",
    damage,
    criticalDamage,
    status,
  }),
} as const satisfies Record<string, Effect | Factory<Effect>>;
