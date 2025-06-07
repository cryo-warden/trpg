import { useMemo } from "react";
import { useAllegianceComponents } from "../context/StdbContext";
import { EntityId } from "../trpg";

export const useGetClassName = (viewpointEntityId: EntityId | null) => {
  const allegianceComponents = useAllegianceComponents();

  return useMemo(() => {
    const entityIdToAllegianceComponent = new Map(
      allegianceComponents.map((a) => [a.entityId, a])
    );
    const entityIdToAllegianceId = (
      entityId: EntityId | null
    ): EntityId | null => {
      if (entityId == null) {
        return null;
      }
      return (
        entityIdToAllegianceComponent.get(entityId)?.allegianceEntityId ?? null
      );
    };

    return (entity: EntityId | string | undefined) => {
      if (entity == null || typeof entity === "string") {
        return "";
      }
      const viewpointAllegianceId = entityIdToAllegianceId(viewpointEntityId);
      const entityAllegianceId = entityIdToAllegianceId(entity);
      if (viewpointAllegianceId == null || entityAllegianceId == null) {
        return "neutral";
      }
      if (viewpointAllegianceId === entityAllegianceId) {
        return "friendly";
      }
      return "hostile";
    };
  }, [viewpointEntityId, allegianceComponents]);
};
