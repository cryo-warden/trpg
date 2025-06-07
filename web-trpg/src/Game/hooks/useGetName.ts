import { useMemo } from "react";
import {
  useAppearanceFeatures,
  useAppearanceFeaturesComponents,
} from "../context/StdbContext";
import { EntityId } from "../trpg";
import { AppearanceFeature } from "../../stdb";

const compareAppearanceFeatures = (
  a: AppearanceFeature,
  b: AppearanceFeature
) => b.priority - a.priority;

const getText = (a: AppearanceFeature) => a.text;

// TODO Return different functions for different languages.
export const useGetName = (viewpointEntityId: EntityId | null) => {
  const appearanceFeatures = useAppearanceFeatures();
  const appearanceFeaturesComponents = useAppearanceFeaturesComponents();

  return useMemo(() => {
    const idToAppearanceFeature = new Map(
      appearanceFeatures.map((af) => [af.id, af])
    );
    const entityIdToAppearanceFeaturesComponent = new Map(
      appearanceFeaturesComponents.map((c) => [c.entityId, c])
    );
    const entityIdToName = (entityId: EntityId): string => {
      const appearanceFeaturesComponent =
        entityIdToAppearanceFeaturesComponent.get(entityId);

      if (appearanceFeaturesComponent == null) {
        return "something";
      }

      const appearanceFeatures =
        appearanceFeaturesComponent.appearanceFeatureIds
          .map((id) => idToAppearanceFeature.get(id))
          .filter((af) => af != null);

      const noun =
        appearanceFeatures
          .filter((af) => af.appearanceFeatureType.tag === "Noun")
          .toSorted(compareAppearanceFeatures)[0]?.text ?? "something";

      const adjectives = appearanceFeatures
        .filter((af) => af.appearanceFeatureType.tag === "Adjective")
        .toSorted(compareAppearanceFeatures)
        .map(getText)
        .slice(0, 3);

      return (adjectives.length > 0 ? adjectives.join(", ") + " " : "") + noun;
    };
    return (
      namedEntityId: EntityId | string | undefined,
      subjectEntityId?: EntityId | string | undefined
    ): string | null => {
      if (namedEntityId == null) {
        return null;
      }
      if (typeof namedEntityId === "string") {
        return namedEntityId;
      }
      if (viewpointEntityId === namedEntityId) {
        if (subjectEntityId === namedEntityId) {
          return "yourself";
        } else {
          return "you";
        }
      }
      return entityIdToName(namedEntityId);
    };
  }, [appearanceFeatures, appearanceFeaturesComponents, viewpointEntityId]);
};
