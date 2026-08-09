import { AppearanceFeatureAsset } from "../assets";
import { EntityId } from "../trpg";

/**
 * Game-domain rules for naming an entity from its appearance features and for
 * choosing pronouns relative to a viewpoint. Framework-free so the web client
 * and a headless/CLI player name entities identically. React hooks resolve
 * feature indexes to assets (via the subscribed appearance_features table's
 * index -> name mapping) and call these; they hold no rules themselves.
 */

const byPriorityDescending = (
  a: AppearanceFeatureAsset,
  b: AppearanceFeatureAsset,
) => b.priority - a.priority;

const MAX_ADJECTIVES = 3;
const UNKNOWN_NOUN = "something";

/**
 * The display name for an entity's appearance features: the highest-priority
 * noun, prefixed with up to three highest-priority adjectives.
 */
export const describeAppearance = (
  features: AppearanceFeatureAsset[] | null,
): string => {
  if (features == null) {
    return UNKNOWN_NOUN;
  }

  const noun =
    features
      .filter((feature) => feature.type === "noun")
      .sort(byPriorityDescending)[0]?.text ?? UNKNOWN_NOUN;

  const adjectives = features
    .filter((feature) => feature.type === "adjective")
    .sort(byPriorityDescending)
    .map((feature) => feature.text)
    .slice(0, MAX_ADJECTIVES)
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
  appearanceFeaturesOf: (entityId: EntityId) => AppearanceFeatureAsset[] | null;
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
  return describeAppearance(appearanceFeaturesOf(named));
};
