import { ActionName } from "../../Game/assets/actions";

/**
 * The en-US locale's rendering of the action asset bundle.
 *
 * Display language lives here in the locale, never in the action assets. Each
 * action's `displayName` (its button label) and `beginTemplate` (the sentence
 * narrated when the action STARTS) render one coherent unit, so they stay
 * together: the label sets what a person expects the telegraph to say.
 *
 * beginTemplate narrates the action's START. An entry WITHOUT one is
 * deliberately silent at start: instant deeds like equip narrate once, at the
 * effect — a begin line would read as the same message twice.
 *
 * FUTURE: an action should also carry a per-effect-kind template, so the same
 * effect reads differently by cause ("dealing 2 damage with a sword" vs "with a
 * hammer"). Not built yet.
 *
 * Completeness is enforced by the COMPILER — a total
 * `Record<ActionName, ActionAppearance>`, so a new action without a rendering is
 * a type error.
 */
export type ActionAppearance = { displayName: string; beginTemplate?: string };

export const ACTION_APPEARANCES: Record<ActionName, ActionAppearance> = {
  move: {
    displayName: "Move",
    beginTemplate: "{0:sentence:subject} moved toward {1:object}.",
  },
  bop: {
    displayName: "Bop",
    beginTemplate: "{0:sentence:subject} wound up to bop {1:object}.",
  },
  boppity_bop: {
    displayName: "Boppity Bop",
    beginTemplate: "{0:sentence:subject} wound up to boppity-bop {1:object}.",
  },
  heal: {
    displayName: "Heal",
    beginTemplate: "{0:sentence:subject} gathered mending light over {1:object}.",
  },
  squeeze: {
    displayName: "Squeeze",
    beginTemplate: "{0:sentence:subject} began squeezing into {1:object}.",
  },
  climb_down: {
    displayName: "Climb Down",
    beginTemplate: "{0:sentence:subject} started a careful climb down {1:object}.",
  },
  climb_up: {
    displayName: "Climb Up",
    beginTemplate: "{0:sentence:subject} started a careful climb up {1:object}.",
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
  maul: {
    displayName: "Maul",
    beginTemplate:
      "{0:sentence:subject} bared {0:possessive} teeth to maul {1:object}.",
  },
  kick: {
    displayName: "Kick",
    beginTemplate: "{0:sentence:subject} kicked at {1:object}.",
  },
  fire_bite: {
    displayName: "Fire Bite",
    beginTemplate: "{0:sentence:subject} sank blazing jaws into {1:object}.",
  },
  fire_punch: {
    displayName: "Fire Punch",
    beginTemplate: "{0:sentence:subject} drove a flaming fist at {1:object}.",
  },
  fire_kick: {
    displayName: "Fire Kick",
    beginTemplate: "{0:sentence:subject} whirled a fiery kick at {1:object}.",
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
  radiance: {
    displayName: "Radiance",
    beginTemplate: "{0:sentence:subject} gathered searing light at {1:object}.",
  },
  shroud: {
    displayName: "Shroud",
    beginTemplate: "{0:sentence:subject} drew a shadow shroud close.",
  },
  hex: {
    displayName: "Hex",
    beginTemplate: "{0:sentence:subject} whispered a hex at {1:object}.",
  },
  take: {
    displayName: "Take",
    beginTemplate: "{0:sentence:subject} reached for {1:object}.",
  },
  drop: {
    displayName: "Drop",
    beginTemplate: "{0:sentence:subject} set down {1:object}.",
  },
  // Equip and unequip narrate at the EFFECT (with the stat change); a
  // begin line would be the identical sentence twice.
  equip: {
    displayName: "Equip",
  },
  unequip: {
    displayName: "Unequip",
  },
  eat: {
    displayName: "Eat",
    beginTemplate: "{0:sentence:subject} bit into {1:object}.",
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
  open: {
    displayName: "Open",
    beginTemplate: "{0:sentence:subject} opened {1:object}.",
  },
  dump: {
    displayName: "Dump",
    beginTemplate: "{0:sentence:subject} tipped {1:object} over.",
  },
  // Instant deed: narrates at the effect, silent at start.
  re_arm: {
    displayName: "Re-arm",
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
  illuminate: {
    displayName: "Illuminate",
    beginTemplate: "{0:sentence:subject} kindled a steady inner light.",
  },
  darken: {
    displayName: "Darken",
    beginTemplate: "{0:sentence:subject} drew the shadows inward.",
  },
  slump: {
    displayName: "Slump",
    beginTemplate: "{0:sentence:subject} slumped back into formlessness.",
  },
  phase: {
    displayName: "Phase",
    beginTemplate: "{0:sentence:subject} faded half out of the world.",
  },
};
