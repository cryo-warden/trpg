import { Action, ActionEffect, ActionType } from "../../stdb/types";

export type ActionAsset = {
  name: Action["name"];
  type: ActionType["tag"]; // WIP Remove actionType, and derive it from steps.
  appearance: { displayName: string; beginTemplate: string };
  steps: ActionEffect[];
};

const Rest = { tag: "Rest" } as const satisfies ActionEffect;
const Move = { tag: "Move" } as const satisfies ActionEffect;
const Attack = (value: number) =>
  ({ tag: "Attack", value }) as const satisfies ActionEffect;
const Heal = (value: number) =>
  ({ tag: "Heal", value }) as const satisfies ActionEffect;

export const ACTIONS = [
  {
    name: "move",
    type: "Move",
    appearance: {
      displayName: "Move",
      beginTemplate: "{0:sentence:subject} moved toward {1:object}.",
    },
    steps: [Rest, Rest, Move, Rest],
  },
  {
    name: "quick_move",
    type: "Move",
    appearance: {
      displayName: "Quick Move",
      beginTemplate: "{0:sentence:subject} moved quickly toward {1:object}.",
    },
    steps: [Move],
  },
  {
    name: "bop",
    type: "Attack",
    appearance: {
      displayName: "Bop",
      beginTemplate: "{0:sentence:subject} wound up to bop {1:object}.",
    },
    steps: [Rest, Rest, Attack(1), Rest],
  },
  {
    name: "boppity_bop",
    type: "Attack",
    appearance: {
      displayName: "Boppity Bop",
      beginTemplate: "{0:sentence:subject} wound up to boppity-bop {1:object}.",
    },
    steps: [Rest, Rest, Attack(1), Rest, Attack(1), Rest, Rest],
  },
  {
    name: "divine_heal",
    type: "Buff",
    appearance: {
      displayName: "Divine Heal",
      beginTemplate:
        "{0:sentence:subject} began to focus a beam of pure lifeforce onto {1:object}.",
    },
    steps: [Heal(500)],
  },
  {
    name: "slime_spray",
    type: "Attack",
    appearance: {
      displayName: "Slime Spray",
      beginTemplate:
        "{0:sentence:subject} sprayed a glob of slime at {1:object}.",
    },
    steps: [Rest, Rest, Rest, Attack(1), Rest, Rest],
  },
] as const satisfies readonly ActionAsset[];
