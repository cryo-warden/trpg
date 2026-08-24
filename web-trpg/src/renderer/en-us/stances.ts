import { StanceName } from "../../Game/assets/stances";

/**
 * The en-US locale's rendering of the stance asset bundle: the title shown on a
 * stance card. Display language lives here in the locale, never in the stance
 * assets. Completeness is enforced by the COMPILER — a total
 * `Record<StanceName, string>`, so a new stance without a title is a type error.
 */
export const STANCE_DISPLAY: Record<StanceName, string> = {
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

/** The en-US card title for a stance role key. An unknown key keeps its raw key
 * visible (drift should be seen, never hidden behind a guess). */
export const stanceDisplayOf = (name: string): string =>
  STANCE_DISPLAY[name as StanceName] ?? name;
