import type { StatusEffectMap } from "../structures/StatusEffectMap";

export type Attack = {
  /** Damage inflicted by the attack. */
  damage: number;
  /** Critical Damage inflicted inherently by the attack. */
  criticalDamage: number;
  /** Map of status effects applied by the attack. */
  status?: StatusEffectMap;
};
