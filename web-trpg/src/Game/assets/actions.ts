import { ActionEffect, ActionType } from "../../stdb/types";

export type ActionAsset = {
  type: ActionType["tag"]; // WIP Remove actionType, and derive it from rounds.
  appearance: { displayName: string; beginTemplate: string };
  /** Ordered rounds; every effect in a round resolves in the same system
   * tick. Most battle actions are a single round. */
  rounds: ActionEffect[][];
};

const Rest = { tag: "Rest" } as const satisfies ActionEffect;
const Move = { tag: "Move" } as const satisfies ActionEffect;
const Attack = (value: number) =>
  ({ tag: "Attack", value }) as const satisfies ActionEffect;
const Heal = (value: number) =>
  ({ tag: "Heal", value }) as const satisfies ActionEffect;

// Most battle actions resolve in a single round; only deliberate wind-ups
// (like move) span several. Multiple effects in one round land on the same
// tick — boppity_bop's double hit is the canonical example.
export const ACTIONS = {
  move: {
    type: "Move",
    appearance: {
      displayName: "Move",
      beginTemplate: "{0:sentence:subject} moved toward {1:object}.",
    },
    rounds: [[Rest], [Rest], [Move]],
  },
  quick_move: {
    type: "Move",
    appearance: {
      displayName: "Quick Move",
      beginTemplate: "{0:sentence:subject} moved quickly toward {1:object}.",
    },
    rounds: [[Move]],
  },
  bop: {
    type: "Attack",
    appearance: {
      displayName: "Bop",
      beginTemplate: "{0:sentence:subject} wound up to bop {1:object}.",
    },
    rounds: [[Attack(1)]],
  },
  boppity_bop: {
    type: "Attack",
    appearance: {
      displayName: "Boppity Bop",
      beginTemplate: "{0:sentence:subject} wound up to boppity-bop {1:object}.",
    },
    rounds: [[Attack(1), Attack(1)]],
  },
  divine_heal: {
    type: "Buff",
    appearance: {
      displayName: "Divine Heal",
      beginTemplate:
        "{0:sentence:subject} began to focus a beam of pure lifeforce onto {1:object}.",
    },
    rounds: [[Heal(500)]],
  },
  slime_spray: {
    type: "Attack",
    appearance: {
      displayName: "Slime Spray",
      beginTemplate:
        "{0:sentence:subject} sprayed a glob of slime at {1:object}.",
    },
    rounds: [[Rest], [Attack(1)]],
  },
  scratch: {
    type: "Attack",
    appearance: {
      displayName: "Scratch",
      beginTemplate: "{0:sentence:subject} brandished its claws at {1:object}.",
    },
    rounds: [[Attack(1)]],
  },
} as const satisfies Record<string, ActionAsset>;

export type ActionName = keyof typeof ACTIONS;
