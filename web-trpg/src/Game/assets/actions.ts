import { ActionAsset, ActionEffect } from "../../stdb/types";

// The TS assets ARE the generated wire types; the only client-side step is
// bundling the Records into entries arrays (see namedPairs). The helpers
// below just construct those generated shapes.

const Move = { tag: "Move" } as const satisfies ActionEffect;
const Attack = (value: number) =>
  ({ tag: "Attack", value }) as const satisfies ActionEffect;
const Heal = (value: number) =>
  ({ tag: "Heal", value }) as const satisfies ActionEffect;

const round = (...effects: ActionEffect[]) => ({
  effects,
  interruptible: false,
});
const interruptibleRound = (...effects: ActionEffect[]) => ({
  effects,
  interruptible: true,
});

// The simplified action grammar: standard movement is one empty
// INTERRUPTIBLE round followed by the movement; most attacks are a single
// round; heavy attacks add an empty round before (preparation) or after
// (recovery), rendered visibly by the client. Multiple effects in one round
// land on the same tick — boppity_bop's double hit is the example.
export const ACTIONS = {
  move: {
    actionType: { tag: "Move" },
    rounds: [interruptibleRound(), round(Move)],
  },
  quick_move: {
    actionType: { tag: "Move" },
    rounds: [round(Move)],
  },
  bop: {
    actionType: { tag: "Attack" },
    rounds: [round(Attack(1))],
  },
  boppity_bop: {
    actionType: { tag: "Attack" },
    // A heavy: interruptible preparation, then the double hit.
    rounds: [interruptibleRound(), round(Attack(1), Attack(1))],
  },
  divine_heal: {
    actionType: { tag: "Buff" },
    rounds: [round(Heal(500))],
  },
  slime_spray: {
    actionType: { tag: "Attack" },
    // A heavy with a committed (uninterruptible) telegraph, then recovery.
    rounds: [round(), round(Attack(1)), round()],
  },
  scratch: {
    actionType: { tag: "Attack" },
    rounds: [round(Attack(1))],
  },
} satisfies Record<string, ActionAsset>;

export type ActionName = keyof typeof ACTIONS;

/** Client-only display vocabulary, keyed like the asset Record. English
 * lives here permanently as the debugging language. */
export type ActionAppearance = { displayName: string; beginTemplate: string };

export const ACTION_APPEARANCES: Record<ActionName, ActionAppearance> = {
  move: {
    displayName: "Move",
    beginTemplate: "{0:sentence:subject} moved toward {1:object}.",
  },
  quick_move: {
    displayName: "Quick Move",
    beginTemplate: "{0:sentence:subject} moved quickly toward {1:object}.",
  },
  bop: {
    displayName: "Bop",
    beginTemplate: "{0:sentence:subject} wound up to bop {1:object}.",
  },
  boppity_bop: {
    displayName: "Boppity Bop",
    beginTemplate: "{0:sentence:subject} wound up to boppity-bop {1:object}.",
  },
  divine_heal: {
    displayName: "Divine Heal",
    beginTemplate:
      "{0:sentence:subject} began to focus a beam of pure lifeforce onto {1:object}.",
  },
  slime_spray: {
    displayName: "Slime Spray",
    beginTemplate: "{0:sentence:subject} sprayed a glob of slime at {1:object}.",
  },
  scratch: {
    displayName: "Scratch",
    beginTemplate: "{0:sentence:subject} brandished its claws at {1:object}.",
  },
};
