import { ActionEffect, ActionType } from "../../stdb/types";

export type ActionRoundAsset = {
  /** Every effect in a round resolves in the same system tick; an empty
   * list is a wait round (a visible preparation or recovery). */
  effects: ActionEffect[];
  /** While this round is active, queuing a new action cancels this one
   * immediately instead of waiting it out. */
  interruptible?: boolean;
};

export type ActionAsset = {
  type: ActionType["tag"]; // WIP Remove actionType, and derive it from rounds.
  appearance: { displayName: string; beginTemplate: string };
  /** Ordered rounds. Most battle actions are a single round; heavies add an
   * empty preparation or recovery round. */
  rounds: ActionRoundAsset[];
};

const Move = { tag: "Move" } as const satisfies ActionEffect;
const Attack = (value: number) =>
  ({ tag: "Attack", value }) as const satisfies ActionEffect;
const Heal = (value: number) =>
  ({ tag: "Heal", value }) as const satisfies ActionEffect;

// The simplified action grammar: standard movement is one empty
// INTERRUPTIBLE round followed by the movement; most attacks are a single
// round; heavy attacks add an empty round before (preparation) or after
// (recovery), rendered visibly by the client. Multiple effects in one round
// land on the same tick — boppity_bop's double hit is the example.
export const ACTIONS = {
  move: {
    type: "Move",
    appearance: {
      displayName: "Move",
      beginTemplate: "{0:sentence:subject} moved toward {1:object}.",
    },
    rounds: [{ effects: [], interruptible: true }, { effects: [Move] }],
  },
  quick_move: {
    type: "Move",
    appearance: {
      displayName: "Quick Move",
      beginTemplate: "{0:sentence:subject} moved quickly toward {1:object}.",
    },
    rounds: [{ effects: [Move] }],
  },
  bop: {
    type: "Attack",
    appearance: {
      displayName: "Bop",
      beginTemplate: "{0:sentence:subject} wound up to bop {1:object}.",
    },
    rounds: [{ effects: [Attack(1)] }],
  },
  boppity_bop: {
    type: "Attack",
    appearance: {
      displayName: "Boppity Bop",
      beginTemplate: "{0:sentence:subject} wound up to boppity-bop {1:object}.",
    },
    // A heavy: interruptible preparation, then the double hit.
    rounds: [
      { effects: [], interruptible: true },
      { effects: [Attack(1), Attack(1)] },
    ],
  },
  divine_heal: {
    type: "Buff",
    appearance: {
      displayName: "Divine Heal",
      beginTemplate:
        "{0:sentence:subject} began to focus a beam of pure lifeforce onto {1:object}.",
    },
    rounds: [{ effects: [Heal(500)] }],
  },
  slime_spray: {
    type: "Attack",
    appearance: {
      displayName: "Slime Spray",
      beginTemplate:
        "{0:sentence:subject} sprayed a glob of slime at {1:object}.",
    },
    // A heavy with a committed (uninterruptible) telegraph, then recovery.
    rounds: [{ effects: [] }, { effects: [Attack(1)] }, { effects: [] }],
  },
  scratch: {
    type: "Attack",
    appearance: {
      displayName: "Scratch",
      beginTemplate: "{0:sentence:subject} brandished its claws at {1:object}.",
    },
    rounds: [{ effects: [Attack(1)] }],
  },
} as const satisfies Record<string, ActionAsset>;

export type ActionName = keyof typeof ACTIONS;
