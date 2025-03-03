export type DamageTaker = {
  /** Defense subtracted from damage */
  defense: number;
  /** Accumulated Damage from a single round */
  accumulatedDamage: number;
  /** Critical Damage Threshold divides your Accumulated Damage to determine how much critical damage you will take for a round. */
  criticalDamageThreshold: number;
};
