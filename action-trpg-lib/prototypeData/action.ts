import { createActionRecord } from "../src/structures/Action";
import { effect, buffEffect } from "../src/structures/Effect";

export const action = createActionRecord([
  { name: "move", effectSequence: [effect.move] },
  { name: "take", effectSequence: [effect.take] },
  { name: "drop", effectSequence: [effect.drop] },
  { name: "equip", effectSequence: [effect.normalEquip] },
  { name: "unequip", effectSequence: [effect.normalUnequip] },
  {
    name: "guard",
    effectSequence: [
      effect.powerfulRest,
      effect.extremeRest,
      buffEffect.normalStatus({
        guard: { defense: 1, duration: 4 },
      }),
    ],
  },
  {
    name: "fancyFootwork",
    effectSequence: [
      effect.normalRest,
      effect.powerfulRest,
      effect.extremeRest,
      buffEffect.normalStatus({
        advantage: { attack: 1, duration: 4 },
      }),
    ],
  },
  {
    name: "slowStrike",
    effectSequence: [
      effect.normalRest,
      effect.normalRest,
      effect.normalRest,
      effect.normalRest,
      effect.normalRest,
      effect.normalRest,
      effect.normalAttack(1),
      effect.normalRest,
      effect.normalRest,
    ],
  },
  {
    name: "nibble",
    effectSequence: [
      effect.normalRest,
      effect.normalRest,
      effect.powerfulRest,
      effect.extremeRest,
      effect.normalAttack(1),
      effect.normalRest,
    ],
  },
  {
    name: "jab",
    effectSequence: [
      effect.normalRest,
      effect.powerfulRest,
      effect.extremeRest,
      effect.normalAttack(2),
      effect.normalRest,
    ],
  },
  {
    name: "doubleStrike",
    effectSequence: [
      effect.normalRest,
      effect.normalAttack(1),
      effect.normalAttack(1),
      effect.extremeRest,
    ],
  },
  {
    name: "tripleStrike",
    effectSequence: [
      effect.normalRest,
      effect.normalAttack(1),
      effect.normalAttack(1),
      effect.normalAttack(0),
      effect.extremeRest,
      effect.powerfulRest,
      effect.normalRest,
    ],
  },
  {
    name: "powerStrike",
    effectSequence: [
      effect.normalRest,
      effect.powerfulRest,
      effect.powerfulAttack(2),
      effect.extremeRest,
    ],
  },
  {
    name: "extremeStrike",
    effectSequence: [
      effect.normalRest,
      effect.powerfulRest,
      effect.extremeAttack(3),
      effect.powerfulRest,
      effect.normalRest,
    ],
  },
  {
    name: "comboStrike",
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
  {
    name: "recover",
    effectSequence: [effect.normalRest, buffEffect.normalHeal(2)],
  },
  {
    name: "luckyHeal",
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
  {
    name: "ultimateNap",
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
]);
