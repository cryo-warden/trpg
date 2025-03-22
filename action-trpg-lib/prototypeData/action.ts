import type { Action } from "../src/structures/Action";
import { effect, buffEffect } from "../src/structures/Effect";

export const action = {
  move: { name: "Move", effectSequence: [effect.move] },
  take: { name: "Take", effectSequence: [effect.take] },
  drop: { name: "Drop", effectSequence: [effect.drop] },
  equip: { name: "Equip", effectSequence: [effect.normalEquip] },
  unequip: { name: "Unequip", effectSequence: [effect.normalUnequip] },
  guard: {
    name: "Guard",
    effectSequence: [
      effect.powerfulRest,
      effect.extremeRest,
      buffEffect.normalStatus({
        guard: { defense: 1, duration: 4 },
      }),
    ],
  },
  fancyFootwork: {
    name: "Fancy Footwork",
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
    name: "Double Strike",
    effectSequence: [
      effect.normalRest,
      effect.normalAttack(0),
      effect.normalAttack(0),
      effect.extremeRest,
    ],
  },
  tripleStrike: {
    name: "Triple Strike",
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
    name: "Power Strike",
    effectSequence: [
      effect.normalRest,
      effect.powerfulRest,
      effect.powerfulAttack(1),
      effect.extremeRest,
    ],
  },
  extremeStrike: {
    name: "Extreme Strike",
    effectSequence: [
      effect.normalRest,
      effect.powerfulRest,
      effect.extremeAttack(2),
      effect.powerfulRest,
      effect.normalRest,
    ],
  },
  comboStrike: {
    name: "Combo Strike",
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
    name: "Recover",
    effectSequence: [effect.normalRest, buffEffect.normalHeal(2)],
  },
  luckyHeal: {
    name: "Lucky Heal",
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
    name: "Ultimate Nap",
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
