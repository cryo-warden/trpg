import type { StatusEffectMap } from "../structures/StatusEffectMap";
import type { ActionState } from "../structures/Attack";

export type DamageTaker = {
  /** Defense subtracted from damage */
  defense: number;
  /** Accumulated Damage from a single round */
  accumulatedDamage: number;
  /** Critical Damage Threshold divides your Accumulated Damage to determine how much critical damage you will take for a round. */
  criticalDamageThreshold: number;
};

export type CriticalDamageTaker = {
  /** Critical Defense subtracted from critical damage */
  criticalDefense: number;
  /** Accumulated Critical Damage from a single round */
  accumulatedCriticalDamage: number;
};

export type HealingTaker = {
  /** Accumulated Healing from a single round */
  accumulatedHealing: number;
};

export type StatusTracker = {
  /** Status Effect Map */
  status: StatusEffectMap;
};

/** Hit Point Tracker */
export type HPTracker = {
  /** Hit Points */
  hp: number;
  /** Maximum Hit Points */
  mhp: number;
};

/** Critical Damage Point Tracker */
export type CDPTracker = {
  /** Critical Damage Points */
  cdp: number;
};

/** Effort Point Tracker */
export type EPTracker = {
  /** Effort Points */
  ep: number;
  /** Maximum Effort Points */
  mep: number;
};

/** An Actor capable of participating in combat. */
export type Actor = {
  /** Attack added to attack effects */
  attack: number;
  /** Action State */
  actionState: null | ActionState;
};
