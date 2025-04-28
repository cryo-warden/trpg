import { buffEffect, createActionRecord, effect } from "../src/Resource";

export const actionRecord = createActionRecord([
  { name: "move", effectSequence: [effect.move], renderer: null },
  { name: "take", effectSequence: [effect.take], renderer: null },
  { name: "drop", effectSequence: [effect.drop], renderer: null },
  { name: "equip", effectSequence: [effect.normalEquip], renderer: null },
  { name: "unequip", effectSequence: [effect.normalUnequip], renderer: null },
  {
    name: "guard",
    renderer: null,
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
    renderer: null,
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
    name: "slowSpout",
    renderer: {
      armamentType: "spout",
      speedType: "slow",
      weightType: "light",
    },
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
    renderer: {
      armamentType: "teeth",
      speedType: "neutral",
      weightType: "light",
    },
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
    renderer: {
      armamentType: "stick",
      speedType: "neutral",
      weightType: "light",
    },
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
    renderer: {
      armamentType: "fist",
      speedType: "fast",
      weightType: "light",
    },
    effectSequence: [
      effect.normalRest,
      effect.normalAttack(1),
      effect.normalAttack(1),
      effect.extremeRest,
    ],
  },
  {
    name: "tripleStrike",
    renderer: {
      armamentType: "fist",
      speedType: "fast",
      weightType: "light",
    },
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
    renderer: {
      armamentType: "fist",
      speedType: "fast",
      weightType: "heavy",
    },
    effectSequence: [
      effect.normalRest,
      effect.powerfulRest,
      effect.powerfulAttack(2),
      effect.extremeRest,
    ],
  },
  {
    name: "extremeStrike",
    renderer: {
      armamentType: "fist",
      speedType: "neutral",
      weightType: "heavy",
    },
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
    renderer: {
      armamentType: "fist",
      speedType: "fast",
      weightType: "heavy",
    },
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
    renderer: null,
    effectSequence: [effect.normalRest, buffEffect.normalHeal(2)],
  },
  {
    name: "luckyHeal",
    renderer: null,
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
    renderer: null,
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
