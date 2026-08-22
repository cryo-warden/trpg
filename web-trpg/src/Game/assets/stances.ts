import { StanceAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";
import { NO_REQUIREMENTS, requirements } from "./stat_requirements";

// A stance is an ordinary grouped contribution to the entity's total. It no
// longer GRANTS actions: the available-action set derives from the readiness
// total, so a stance shapes actions only through the readiness it adds (upright
// for footing, etc.) and its own adoption requirements. Requirements gate
// ADOPTING it and are checked against the entity's stance-free readiness (body +
// traits + carried gear).
//
// UPRIGHT is the posture stat: stances provide it, and actions that need footing
// require it (dive and lie_down need upright 1), so "you can't dive when already
// flat" is ordinary requirement filtering. (A posture into the stance already
// held is separately excluded from the derived actions.)
export const STANCES = {
  // The improvising default: what you can do standing is exactly what your body,
  // traits, and armaments derive. Needs feet — a formless body cannot stand.
  standing: {
    requirements: requirements({ foot: 1 }),
    block: statBlock({ upright: 2 }),
  },
  // Knocked down: harder to fight from, and gait sinks below what movement
  // actions require, so they drop out of the derived available actions. The one
  // universal posture — anything can be flat, and the defeat system forces it —
  // so it stays ungated.
  prone: {
    requirements: NO_REQUIREMENTS,
    block: statBlock({ attack: -1, defense: -1, gait: -2 }),
  },
  sitting: {
    requirements: requirements({ foot: 1 }),
    block: statBlock({ defense: -1, gait: -2, upright: 1 }),
  },
  // Defensive footing.
  ready: {
    requirements: requirements({ foot: 1 }),
    block: statBlock({ defense: 1, upright: 2 }),
  },
  brawler: {
    requirements: requirements({ hand: 1, foot: 1 }),
    block: statBlock({ upright: 2 }),
  },
  dueling: {
    requirements: requirements({ bladed: 1, foot: 1 }),
    block: statBlock({ attack: 1, upright: 2 }),
  },
  // Built for covering ground.
  striding: {
    requirements: requirements({ foot: 1 }),
    block: statBlock({ gait: 1, upright: 2 }),
  },
  perched: {
    requirements: requirements({ wing: 1 }),
    block: statBlock({ defense: 1, gait: -2, upright: 1 }),
  },
  flapping: {
    requirements: requirements({ wing: 2 }),
    block: statBlock({ gait: 2, upright: 2 }),
  },
  // General magic; the elemental specializations GRANT the matching element,
  // so centering into one is one of the two ways to meet a spell's element
  // requirement (a channeling armament is the other). Entering needs `focus`
  // (a body's innate channeling or a channeling armament provides it), never
  // the element itself — the stance is what supplies that. (No mep grant: the
  // maxima are a ratchet, so a stance-carried maximum would be a one-time
  // permanent boost.)
  casting: {
    requirements: requirements({ focus: 1 }),
    block: statBlock({ upright: 2 }),
  },
  fire_casting: {
    requirements: requirements({ focus: 1 }),
    block: statBlock({ fire: 1, upright: 2 }),
  },
  ice_casting: {
    requirements: requirements({ focus: 1 }),
    block: statBlock({ ice: 1, defense: 1, upright: 2 }),
  },
  lightning_casting: {
    requirements: requirements({ focus: 1 }),
    block: statBlock({ lightning: 1, upright: 2 }),
  },
  light_casting: {
    requirements: requirements({ focus: 1 }),
    block: statBlock({ light: 1, upright: 2 }),
  },
  shadow_casting: {
    requirements: requirements({ focus: 1 }),
    block: statBlock({ shadow: 1, upright: 2 }),
  },
  // Only a formless body can pour itself into this shape; a legged creature
  // cannot. The reciprocal of the footing stances' `foot` gate.
  amorphous: {
    requirements: requirements({ amorphous: 1 }),
    block: statBlock({}),
  },
  // The ethereal beings' posture: a sprite or wisp goes half-incorporeal, harder
  // to land a blow on (+1 defense). Gated on `ethereal`, which only such bodies
  // carry — no footing needed, so a floating being holds it without feet.
  intangible: {
    requirements: requirements({ ethereal: 1 }),
    block: statBlock({ defense: 1 }),
  },
} satisfies Record<string, StanceAsset>;

export type StanceName = keyof typeof STANCES;

/** What a person reads as a stance card's title (see
 * ARMAMENT_DISPLAY_NAMES). */
export const STANCE_DISPLAY_NAMES: Record<StanceName, string> = {
  standing: "Standing",
  prone: "Prone",
  sitting: "Sitting",
  ready: "Ready",
  brawler: "Brawler",
  dueling: "Dueling",
  striding: "Striding",
  perched: "Perched",
  flapping: "Flapping",
  casting: "Casting",
  fire_casting: "Fire Casting",
  ice_casting: "Ice Casting",
  lightning_casting: "Lightning Casting",
  light_casting: "Light Casting",
  shadow_casting: "Shadow Casting",
  amorphous: "Amorphous",
  intangible: "Intangible",
};
