import { useMemo } from "react";
import { useAppearanceFeatureAssetsOf } from "../Game/context/StdbContext/assetLookup";
import { useLastKnownAppearanceIndexes } from "../Game/context/StdbContext/components";
import { EntityId } from "../Game/trpg";
import { getName } from "../Game/domain/appearance";

/**
 * Pulls appearance data and exposes the domain naming rule bound to a viewpoint.
 * Names currently come straight from the English strings embedded in the
 * appearance assets, which every language leverages for now. A future language
 * plugin will supply its own vocabulary picker here instead.
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
      });
  }, [
    appearanceFeatureIndexesByEntityId,
    appearanceFeatureAssetsOf,
    viewpointEntityId,
  ]);
};
