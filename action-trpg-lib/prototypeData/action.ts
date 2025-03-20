import type { Action } from "../src/structures/Action";
import { effect, buffEffect } from "../src/structures/Effect";

export const action = {
  move: {
    effectSequence: [effect.move],
  },
  guard: {
    effectSequence: [
      effect.powerfulRest,
      effect.extremeRest,
      buffEffect.normalStatus({
        guard: { defense: 1, duration: 4 },
      }),
    ],
  },
  fancyFootwork: {
    effectSequence: [
      effect.normalRest,
      effect.powerfulRest,
      effect.extremeRest,
      buffEffect.normalStatus({
        advantage: { attack: 1, duration: 4 },
      }),
    ],
  },
  doubleStrike: {
    effectSequence: [
      effect.normalRest,
      effect.normalAttack(0),
      effect.normalAttack(0),
      effect.extremeRest,
    ],
  },
  tripleStrike: {
    effectSequence: [
      effect.normalRest,
      effect.normalAttack(0),
      effect.normalAttack(0),
      effect.normalAttack(0),
      effect.extremeRest,
      effect.powerfulRest,
      effect.normalRest,
    ],
  },
  powerStrike: {
    effectSequence: [
      effect.normalRest,
      effect.powerfulRest,
      effect.powerfulAttack(1),
      effect.extremeRest,
    ],
  },
  extremeStrike: {
    effectSequence: [
      effect.normalRest,
      effect.powerfulRest,
      effect.extremeAttack(2),
      effect.powerfulRest,
      effect.normalRest,
    ],
  },
  comboStrike: {
    effectSequence: [
      effect.extremeRest,
      effect.powerfulRest,
      effect.normalRest,
      effect.normalAttack(0),
      effect.normalRest,
      effect.powerfulAttack(1),
      effect.normalRest,
      effect.powerfulRest,
      effect.extremeAttack(2),
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
      effect.normalRest,
      effect.normalRest,
      buffEffect.extremeHeal(7),
    ],
  },
  ultimateNap: {
    effectSequence: [
      effect.normalRest,
      effect.normalRest,
      effect.normalRest,
      effect.normalRest,
      effect.powerfulRest,
      effect.powerfulRest,
      effect.powerfulRest,
      effect.extremeRest,
      effect.extremeRest,
      buffEffect.extremeStatus({
        advantage: {
          attack: 2,
          duration: 10,
        },
        guard: {
          defense: 2,
          duration: 10,
        },
        fortify: {
          mhp: 20,
          duration: 10,
        },
      }),
    ],
  },
} as const satisfies Record<string, Action>;
