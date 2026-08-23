import { EntityBlobAsset } from "../../stdb/types";
import { armament } from "./gear";

// Armaments PROVIDE armament readiness (bladed, blunt, pole, ward, focus) and
// CONSUME grip: a negative `hand` costs a body-capacity slot AND a free-hand
// readiness, so a wielded weapon drops the unarmed bop from the derived set.
// The attacks each weapon suggests now DERIVE from the readiness it adds (a
// blade's `bladed` derives slash/stab/cleave/lunge; a club's `blunt` derives
// smash), gated further by morale like any action. A shield here is a plain
// one-hander (it removes the free hand); a gauntlet or a strap-shield would set
// `handReadiness: 0` to keep the free hand.
//
// A channeling armament that grants `focus` also grants ONE element (fire, ice,
// lightning, light, shadow) — so holding one lets any body cast that element's
// spells from any stance, the second path to an element besides the matching
// casting stance. The mundane quarterstaff below grants no focus and no element
// on purpose: it is a plain pole weapon, not a channeling implement.
export const ARMAMENTS = {
  club: armament({ blunt: 1, hand: -1, morale: 1 }, ["club"]),
  // A blade or an axe in hand steadies the nerves: morale is a stat, so a
  // wielded weapon's contribution can itself overcome a fear.
  sword: armament({ bladed: 1, hand: -1, morale: 1 }, ["sword"]),
  staff: armament({ pole: 1, blunt: 1, hand: -2, morale: 1 }, ["staff"]),
  // A shield at the ready steadies the nerve more than a blade: it is the
  // posture of standing your ground.
  shield: armament({ ward: 1, defense: 1, hand: -1, morale: 2 }, ["shield"]),
  spear: armament({ pole: 1, reach: 1, hand: -2, morale: 1 }, ["spear"]),
  axe: armament({ bladed: 1, attack: 1, hand: -1, morale: 1 }, ["axe"]),
  dagger: armament({ bladed: 1, hand: -1, morale: 1 }, ["dagger"]),
  // Channeling implements: one per element, each granting focus + its element
  // and occupying one hand. Distinct looks (staff/charm/talisman/idol/medallion)
  // stand in for the eventual full staves/orbs/talismans set.
  flame_staff: armament({ focus: 1, fire: 1, hand: -1, morale: 1 }, ["staff"]),
  frost_charm: armament({ focus: 1, ice: 1, hand: -1, morale: 1 }, ["charm"]),
  storm_talisman: armament(
    { focus: 1, lightning: 1, hand: -1, morale: 1 },
    ["talisman"],
  ),
  radiant_idol: armament({ focus: 1, light: 1, hand: -1, morale: 1 }, ["idol"]),
  gloom_medallion: armament(
    { focus: 1, shadow: 1, hand: -1, morale: 1 },
    ["medallion"],
  ),
} satisfies Record<string, EntityBlobAsset>;

export type ArmamentName = keyof typeof ARMAMENTS;

/** What a person reads on an armament button — the ACTION_APPEARANCES
 * seam for gear. The Record over ArmamentName makes a missing entry a
 * compile error. */
export const ARMAMENT_DISPLAY_NAMES: Record<ArmamentName, string> = {
  club: "Club",
  sword: "Sword",
  staff: "Staff",
  shield: "Shield",
  spear: "Spear",
  axe: "Axe",
  dagger: "Dagger",
  flame_staff: "Flame Staff",
  frost_charm: "Frost Charm",
  storm_talisman: "Storm Talisman",
  radiant_idol: "Radiant Idol",
  gloom_medallion: "Gloom Medallion",
};
