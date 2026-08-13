import { ActionAsset, ActionEffectAsset } from "../../stdb/types";
import { NO_REQUIREMENTS, requirements } from "./stat_requirements";

// The TS assets ARE the generated wire types; the only client-side step is
// bundling the Records into entries arrays (see namedPairs). The helpers
// below just construct those generated shapes.

const Move = { tag: "Move" } as const satisfies ActionEffectAsset;
const Attack = (value: number) =>
  ({ tag: "Attack", value }) as const satisfies ActionEffectAsset;
const Heal = (value: number) =>
  ({ tag: "Heal", value }) as const satisfies ActionEffectAsset;
const Guard = (value: number) =>
  ({
    tag: "Buff",
    value: { tag: "Guard", value },
  }) as const satisfies ActionEffectAsset;
const Take = { tag: "Take" } as const satisfies ActionEffectAsset;
const Drop = { tag: "Drop" } as const satisfies ActionEffectAsset;
const Intimidate = (value: number) =>
  ({ tag: "Intimidate", value }) as const satisfies ActionEffectAsset;
const Rally = { tag: "Rally" } as const satisfies ActionEffectAsset;
const Attune = { tag: "Attune" } as const satisfies ActionEffectAsset;
const SetStance = (stanceName: string) =>
  ({ tag: "SetStance", value: stanceName }) as const satisfies ActionEffectAsset;

/** A deliberate stance change: one round spent shifting posture. */
const posture = (stanceName: string) => ({
  actionType: { tag: "Posture" } as const,
  requirements: NO_REQUIREMENTS,
  rounds: [round(SetStance(stanceName))],
});
const Dive = (defense: number) =>
  ({ tag: "Dive", value: defense }) as const satisfies ActionEffectAsset;

const round = (...effects: ActionEffectAsset[]) => ({
  effects,
  interruptible: false,
});
const interruptibleRound = (...effects: ActionEffectAsset[]) => ({
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
    requirements: requirements({ gait: 1 }),
    rounds: [interruptibleRound(), round(Move)],
  },
  quick_move: {
    actionType: { tag: "Move" },
    requirements: requirements({ gait: 1 }),
    rounds: [round(Move)],
  },
  bop: {
    actionType: { tag: "Attack" },
    requirements: requirements({ hand: 1 }),
    rounds: [round(Attack(1))],
  },
  boppity_bop: {
    actionType: { tag: "Attack" },
    requirements: requirements({ hand: 1 }),
    // A heavy: interruptible preparation, then the double hit. The wind-up
    // IS the scary part: heavies author their extra intimidation onto the
    // telegraph round.
    rounds: [interruptibleRound(Intimidate(1)), round(Attack(1), Attack(1))],
  },
  divine_heal: {
    actionType: { tag: "Buff" },
    requirements: NO_REQUIREMENTS,
    rounds: [round(Heal(500))],
  },
  slime_spray: {
    actionType: { tag: "Attack" },
    requirements: NO_REQUIREMENTS,
    // A heavy with a committed (uninterruptible) telegraph, then recovery.
    rounds: [round(Intimidate(1)), round(Attack(1)), round()],
  },
  scratch: {
    actionType: { tag: "Attack" },
    requirements: NO_REQUIREMENTS,
    rounds: [round(Attack(1))],
  },
  guard: {
    actionType: { tag: "Buff" },
    requirements: NO_REQUIREMENTS,
    rounds: [round(Guard(1))],
  },
  bite: {
    actionType: { tag: "Attack" },
    requirements: NO_REQUIREMENTS,
    rounds: [round(Attack(1))],
  },
  // Armament basics: each armament grants its own attack, and the
  // requirement re-checks the property the armament provides.
  smash: {
    actionType: { tag: "Attack" },
    requirements: requirements({ blunt: 1 }),
    rounds: [interruptibleRound(Intimidate(1)), round(Attack(2))],
  },
  slash: {
    actionType: { tag: "Attack" },
    requirements: requirements({ bladed: 1 }),
    rounds: [round(Attack(2))],
  },
  stab: {
    actionType: { tag: "Attack" },
    requirements: requirements({ bladed: 1 }),
    rounds: [round(Attack(1))],
  },
  cleave: {
    actionType: { tag: "Attack" },
    requirements: requirements({ bladed: 1 }),
    // A heavy: interruptible wind-up, then the blow.
    rounds: [interruptibleRound(Intimidate(2)), round(Attack(3))],
  },
  thrust: {
    actionType: { tag: "Attack" },
    requirements: requirements({ pole: 1, reach: 1 }),
    rounds: [round(Attack(2))],
  },
  shield_bash: {
    actionType: { tag: "Attack" },
    requirements: requirements({ ward: 1 }),
    rounds: [round(Attack(1))],
  },
  lunge: {
    actionType: { tag: "Attack" },
    requirements: requirements({ bladed: 1 }),
    // Committed footwork first, then the strike.
    rounds: [interruptibleRound(Intimidate(2)), round(Attack(3))],
  },
  fire_bolt: {
    actionType: { tag: "Attack" },
    requirements: requirements({ focus: 1 }),
    rounds: [interruptibleRound(Intimidate(2)), round(Attack(3))],
  },
  ice_shard: {
    actionType: { tag: "Attack" },
    requirements: requirements({ focus: 1 }),
    rounds: [round(Attack(2))],
  },
  lightning_arc: {
    actionType: { tag: "Attack" },
    requirements: requirements({ focus: 1 }),
    // Two strikes on the same tick.
    rounds: [round(Attack(1), Attack(1))],
  },
  // Inventory verbs: carrying IS location, so taking pulls the item into
  // the taker and dropping pushes it back out to the room. Taking needs no
  // FREE grip — items go to inventory (containment), not into a hand, so a
  // fully-armed wielder can still pocket what they find.
  take: {
    actionType: { tag: "Inventory" },
    requirements: NO_REQUIREMENTS,
    rounds: [round(Take)],
  },
  drop: {
    actionType: { tag: "Inventory" },
    requirements: NO_REQUIREMENTS,
    rounds: [round(Drop)],
  },
  // The cower stance's counterplay: spends EP dynamically — exactly the
  // deficit against the fear — for a courage status that overcomes it.
  rally: {
    actionType: { tag: "Buff" },
    requirements: NO_REQUIREMENTS,
    rounds: [round(Rally)],
  },
  // Seal the trance: bind your checkpoint to a fortune-telling object's
  // room. Death wakes you there. A small ritual: one interruptible round of
  // gazing, then the binding.
  attune: {
    actionType: { tag: "Attune" },
    requirements: NO_REQUIREMENTS,
    rounds: [interruptibleRound(), round(Attune)],
  },
  // Stance changes ARE actions — a round spent shifting posture, no
  // separate UI. Each goes through the shared adoption gates (known stance,
  // requirements, the fear gate).
  stand: posture("standing"),
  sit: posture("sitting"),
  lie_down: posture("prone"),
  ready_up: posture("ready"),
  square_up: posture("brawler"),
  duel: posture("dueling"),
  stride: posture("striding"),
  perch: posture("perched"),
  take_wing: posture("flapping"),
  center: posture("casting"),
  kindle: posture("fire_casting"),
  chill: posture("ice_casting"),
  charge: posture("lightning_casting"),
  slump: posture("amorphous"),
  // Hit the deck: lands prone (fear stays if present), braced for +2
  // defense, and grabs a targeted item mid-dive — a wielded weapon's morale
  // can itself overcome a fear.
  dive: {
    actionType: { tag: "Dive" },
    requirements: NO_REQUIREMENTS,
    rounds: [round(Dive(2))],
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
    beginTemplate:
      "{0:sentence:subject} brandished {0:possessive} claws at {1:object}.",
  },
  guard: {
    displayName: "Guard",
    beginTemplate: "{0:sentence:subject} took a guarded footing.",
  },
  bite: {
    displayName: "Bite",
    beginTemplate:
      "{0:sentence:subject} snapped {0:possessive} jaws at {1:object}.",
  },
  smash: {
    displayName: "Smash",
    beginTemplate: "{0:sentence:subject} hefted a bludgeon toward {1:object}.",
  },
  slash: {
    displayName: "Slash",
    beginTemplate: "{0:sentence:subject} slashed at {1:object}.",
  },
  stab: {
    displayName: "Stab",
    beginTemplate: "{0:sentence:subject} stabbed at {1:object}.",
  },
  cleave: {
    displayName: "Cleave",
    beginTemplate: "{0:sentence:subject} raised an axe over {1:object}.",
  },
  thrust: {
    displayName: "Thrust",
    beginTemplate: "{0:sentence:subject} thrust at {1:object}.",
  },
  shield_bash: {
    displayName: "Shield Bash",
    beginTemplate: "{0:sentence:subject} drove a shield into {1:object}.",
  },
  lunge: {
    displayName: "Lunge",
    beginTemplate: "{0:sentence:subject} lunged toward {1:object}.",
  },
  fire_bolt: {
    displayName: "Fire Bolt",
    beginTemplate: "{0:sentence:subject} kindled a bolt of fire at {1:object}.",
  },
  ice_shard: {
    displayName: "Ice Shard",
    beginTemplate: "{0:sentence:subject} loosed a shard of ice at {1:object}.",
  },
  lightning_arc: {
    displayName: "Lightning Arc",
    beginTemplate: "{0:sentence:subject} arced lightning toward {1:object}.",
  },
  take: {
    displayName: "Take",
    beginTemplate: "{0:sentence:subject} reached for {1:object}.",
  },
  drop: {
    displayName: "Drop",
    beginTemplate: "{0:sentence:subject} set down {1:object}.",
  },
  rally: {
    displayName: "Rally",
    beginTemplate: "{0:sentence:subject} steadied {0:possessive} nerve.",
  },
  dive: {
    displayName: "Dive",
    beginTemplate: "{0:sentence:subject} dove for {1:object}.",
  },
  attune: {
    displayName: "Attune",
    beginTemplate: "{0:sentence:subject} gazed into {1:object}, entranced.",
  },
  stand: {
    displayName: "Stand",
    beginTemplate: "{0:sentence:subject} rose to {0:possessive} feet.",
  },
  sit: {
    displayName: "Sit",
    beginTemplate: "{0:sentence:subject} sat down.",
  },
  lie_down: {
    displayName: "Lie Down",
    beginTemplate: "{0:sentence:subject} lay down flat.",
  },
  ready_up: {
    displayName: "Ready Up",
    beginTemplate: "{0:sentence:subject} took a guarded footing.",
  },
  square_up: {
    displayName: "Square Up",
    beginTemplate: "{0:sentence:subject} raised {0:possessive} fists.",
  },
  duel: {
    displayName: "Duel",
    beginTemplate: "{0:sentence:subject} slid into a duelist's guard.",
  },
  stride: {
    displayName: "Stride",
    beginTemplate: "{0:sentence:subject} set off at a stride.",
  },
  perch: {
    displayName: "Perch",
    beginTemplate: "{0:sentence:subject} settled onto a perch.",
  },
  take_wing: {
    displayName: "Take Wing",
    beginTemplate: "{0:sentence:subject} took wing.",
  },
  center: {
    displayName: "Center",
    beginTemplate: "{0:sentence:subject} centered {0:possessive} focus.",
  },
  kindle: {
    displayName: "Kindle",
    beginTemplate: "{0:sentence:subject} kindled an inner flame.",
  },
  chill: {
    displayName: "Chill",
    beginTemplate: "{0:sentence:subject} drew in a killing cold.",
  },
  charge: {
    displayName: "Charge",
    beginTemplate: "{0:sentence:subject} crackled with gathering charge.",
  },
  slump: {
    displayName: "Slump",
    beginTemplate: "{0:sentence:subject} slumped back into formlessness.",
  },
};
