import { useMemo } from "react";
import { useAppearanceFeatureAssetsOf } from "../Game/context/StdbContext/assetLookup";
import { useLastKnownAppearanceIndexes } from "../Game/context/StdbContext/components";
import { AppearanceFeatureName } from "../Game/assets/appearance_features";
import { EntityId } from "../Game/trpg";
import { getName } from "../Game/domain/appearance";
import { appearanceFeatureDisplayOf } from "./en-us/appearanceFeatures";

/**
 * Pulls appearance data and exposes the domain naming rule bound to a viewpoint.
 * Names render through the en-US locale's appearance vocabulary — display text
 * lives in the locale, never in the assets. Selecting a locale per player will
 * later swap which vocabulary is passed as `displayOf` here.
 */
export const useGetName = (viewpointEntityId: EntityId | null) => {
  // LAST-KNOWN appearance, not just the live rows: an entity deleted in
  // the same transaction as its final event (an eaten cookie) still
  // names by its final look, never as "something".
  const appearanceFeatureIndexesByEntityId = useLastKnownAppearanceIndexes();
  const appearanceFeatureAssetsOf = useAppearanceFeatureAssetsOf();

  return useMemo(() => {
    return (input: {
      named: EntityId | string | undefined;
      subject?: EntityId | string | undefined;
    }): string | null =>
      getName({
        ...input,
        viewpoint: viewpointEntityId,
        appearanceFeaturesOf: (entityId) =>
          appearanceFeatureAssetsOf(
            appearanceFeatureIndexesByEntityId.get(entityId) ?? null,
          ),
        displayOf: (name) =>
          appearanceFeatureDisplayOf(name as AppearanceFeatureName),
      });
  }, [
    appearanceFeatureIndexesByEntityId,
    appearanceFeatureAssetsOf,
    viewpointEntityId,
  ]);
};
