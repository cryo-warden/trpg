import type { Entity } from "../Entity";
import type { Action } from "../structures/Action";
import type { StatusEffectMap } from "../structures/StatusEffectMap";

export type Target = Entity[];

export type ActionState = {
  action: Action;
  effectSequenceIndex: number;
  target: Target;
};
type Observation = {
  message: string;
};

export type Observer = {
  observations: Observation[];
};

export type Observable = {
  observations: Observation[];
};
export type Attack = {
  /** Damage inflicted by the attack. */
  damage: number;
  /** Critical Damage inflicted inherently by the attack. */
  criticalDamage: number;
  /** Map of status effects applied by the attack. */
  status?: StatusEffectMap;
};
