import type { Action } from "./Action";
import { effect, buffEffect } from "./Effect";

export const action = {
  move: {
    effectSequence: [effect.move],
  },
  doubleStrike: {
    effectSequence: [
      effect.normalRest,
      effect.normalAttack(1),
      effect.normalAttack(1),
      effect.normalRest,
    ],
  },
  tripleStrike: {
    effectSequence: [
      effect.normalRest,
      effect.normalAttack(1),
      effect.normalAttack(1),
      effect.normalAttack(1),
      effect.normalRest,
      effect.normalRest,
    ],
  },
  powerStrike: {
    effectSequence: [
      effect.normalRest,
      effect.powerfulAttack(2),
      effect.normalRest,
    ],
  },
  extremeStrike: {
    effectSequence: [
      effect.normalRest,
      effect.normalRest,
      effect.extremeAttack(3),
      effect.normalRest,
      effect.normalRest,
    ],
  },
  comboStrike: {
    effectSequence: [
      effect.normalRest,
      effect.normalAttack(1),
      effect.powerfulAttack(2),
      effect.extremeAttack(3),
    ],
  },
  recover: {
    effectSequence: [effect.normalRest, buffEffect.normalHeal(2)],
  },
  luckyHeal: {
    effectSequence: [
      effect.normalRest,
      effect.normalRest,
      effect.normalRest,
      effect.normalRest,
      buffEffect.extremeHeal(7),
    ],
  },
  ultimateNap: {
    effectSequence: [
      effect.normalRest,
      effect.normalRest,
      effect.powerfulRest,
      effect.extremeRest,
    ],
  },
} as const satisfies Record<string, Action>;
