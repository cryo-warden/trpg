import { useMemo } from "react";
import { useAllegianceComponents } from "../Game/context/StdbContext/components";
import { EntityId } from "../Game/trpg";
import { classifyRelationship } from "../Game/domain/relationship";

/**
 * Pulls allegiance data and exposes the domain relationship rule bound to a
 * viewpoint, as a presentation class name. Literals and unknown entities carry
 * no class.
 */
export const useGetClassName = (viewpointEntityId: EntityId | null) => {
  const allegianceComponents = useAllegianceComponents();

  return useMemo(() => {
    const allegianceIdByEntityId = new Map(
      allegianceComponents.map((a) => [a.entityId, a.allegianceEntityId]),
    );
    const allegianceIdOf = (entityId: EntityId | null): EntityId | null =>
      entityId == null ? null : (allegianceIdByEntityId.get(entityId) ?? null);

    return (entity: EntityId | string | undefined): string => {
      if (entity == null || typeof entity === "string") {
        return "";
      }
      return classifyRelationship({
        viewpointAllegianceId: allegianceIdOf(viewpointEntityId),
        entityAllegianceId: allegianceIdOf(entity),
      });
    };
  }, [viewpointEntityId, allegianceComponents]);
};
