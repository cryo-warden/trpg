import { AppearanceFeatureAsset } from "../../stdb/types";
import { EntityId } from "../trpg";

/**
 * Game-domain rules for naming an entity from its appearance features and for
 * choosing pronouns relative to a viewpoint. Framework-free so the web client
 * and a headless/CLI player name entities identically. React hooks resolve
 * feature indexes to assets (via the subscribed appearance_features table's
 * index -> name mapping) and call these; they hold no rules themselves.
 */

/**
 * A resolved appearance feature. Naming reads each feature's exclusion group
 * (AppearanceFeature.exclusionGroup): features sharing a group are
 * ALTERNATIVES — at most one renders (the noun when it wins the name, else
 * the group's best adjective). An absent group means the feature stands
 * alone in its own group and always applies.
 *
 * Carries the feature's ROLE KEY (`name`), never its display word: an asset
 * names a role, and a locale turns that role key into text (see `DisplayOf`).
 */
export type NamingFeature = AppearanceFeatureAsset & { name: string };

/** A locale's rendering of an appearance-feature role key into display text. */
export type DisplayOf = (featureName: string) => string;

const byPriorityDescending = (
  a: { priority: number },
  b: { priority: number },
) => b.priority - a.priority;

const MAX_ADJECTIVES = 3;
const UNKNOWN_NOUN = "something";

const isNoun = (feature: NamingFeature) =>
  feature.appearanceFeatureType.tag === "Noun";
const isAdjective = (feature: NamingFeature) =>
  feature.appearanceFeatureType.tag === "Adjective";

/** The noun that wins the single noun slot: the highest-priority noun, or
 * null when featureless. Baselines sit low ("human" at the bottom) so an
 * identity noun ("skeleton", "zombie") outranks and REPLACES them, while a
 * real creature body outranks the identity, leaving it to ride along as an
 * adjective ("skeletal wolf", "zombie bat"). */
const nounWinnerOf = (features: NamingFeature[]): NamingFeature | null =>
  features.filter(isNoun).sort(byPriorityDescending)[0] ?? null;

/** The defining noun's ROLE KEY for a feature set, or null when featureless.
 * (The key, not display text — the caller renders it, or keys grammar off it.) */
export const nounKeyOf = (features: NamingFeature[] | null): string | null =>
  features == null ? null : (nounWinnerOf(features)?.name ?? null);

/**
 * The display name for an entity's appearance features: the winning noun,
 * prefixed with up to three adjectives — ONE per remaining group (its
 * highest-priority adjective), highest priority last. A group that won the
 * noun contributes no adjective, so a trait's noun and adjective never both
 * appear. Each feature's role key is rendered to text by the given locale
 * (`displayOf`) — no display word ever lives on the feature itself.
 */
export const describeAppearance = ({
  features,
  displayOf,
}: {
  features: NamingFeature[] | null;
  displayOf: DisplayOf;
}): string => {
  if (features == null) {
    return UNKNOWN_NOUN;
  }

  // Each feature's group; an ungrouped feature stands alone in its own.
  const groupKeys = features.map(
    (feature, index) => feature.exclusionGroup ?? `#${index}`,
  );
  const winner = nounWinnerOf(features);
  const noun = winner != null ? displayOf(winner.name) : UNKNOWN_NOUN;
  const winnerGroup =
    winner == null ? null : groupKeys[features.indexOf(winner)];

  const bestAdjectiveByGroup = new Map<string, NamingFeature>();
  features.forEach((feature, index) => {
    if (!isAdjective(feature) || groupKeys[index] === winnerGroup) {
      return;
    }
    const current = bestAdjectiveByGroup.get(groupKeys[index]);
    if (current == null || feature.priority > current.priority) {
      bestAdjectiveByGroup.set(groupKeys[index], feature);
    }
  });

  const adjectives = [...bestAdjectiveByGroup.values()]
    .sort(byPriorityDescending)
    .slice(0, MAX_ADJECTIVES)
    .map((feature) => displayOf(feature.name))
    .reverse();

  return (adjectives.length > 0 ? adjectives.join(", ") + " " : "") + noun;
};

export type NameInputs = {
  /** The entity (or literal string) being named. */
  named: EntityId | string | undefined;
  /** The grammatical subject, used to pick "yourself" over "you". */
  subject?: EntityId | string | undefined;
  /** The entity whose perspective the name is rendered from, if any. */
  viewpoint: EntityId | null;
  /** Looks up an entity's resolved appearance features, or null if unknown. */
  appearanceFeaturesOf: (entityId: EntityId) => NamingFeature[] | null;
  /** The locale's rendering of a feature role key into display text. */
  displayOf: DisplayOf;
};

/**
 * Names an entity from a viewpoint: literals pass through, the viewpoint entity
 * becomes "you"/"yourself", and everything else is described by appearance.
 */
export const getName = ({
  named,
  subject,
  viewpoint,
  appearanceFeaturesOf,
  displayOf,
}: NameInputs): string | null => {
  if (named == null) {
    return null;
  }
  if (typeof named === "string") {
    return named;
  }
  if (viewpoint === named) {
    return subject === named ? "yourself" : "you";
  }
  return describeAppearance({ features: appearanceFeaturesOf(named), displayOf });
};

/** Third-person possessives, chosen by personhood and gender. */
export type PossessivePronoun = "their" | "its" | "her" | "his";

export type PossessiveInputs = {
  named: EntityId | string | undefined;
  viewpoint: EntityId | null;
  appearanceFeaturesOf: (entityId: EntityId) => NamingFeature[] | null;
  /** The language vocabulary: possessive for a defining noun (null =
   * unknown noun). */
  possessiveForNoun: (noun: string | null) => PossessivePronoun;
};

/**
 * The possessive pronoun for an entity from a viewpoint: second person gets
 * "your"; third person defers to the vocabulary's personhood/gender choice
 * for the entity's defining noun.
 */
export const getPossessive = ({
  named,
  viewpoint,
  appearanceFeaturesOf,
  possessiveForNoun,
}: PossessiveInputs): string => {
  if (named == null || typeof named === "string") {
    return "its";
  }
  if (viewpoint === named) {
    return "your";
  }
  return possessiveForNoun(nounKeyOf(appearanceFeaturesOf(named)));
};
