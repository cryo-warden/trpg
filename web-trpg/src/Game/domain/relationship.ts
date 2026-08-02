import { EntityId } from "../trpg";

/**
 * Game-domain rule for how one entity stands toward another: same allegiance is
 * friendly, differing allegiances are hostile, and any unknown allegiance is
 * neutral. Framework-free; hooks pull allegiance data and call this.
 */
export type Relationship = "friendly" | "hostile" | "neutral";

export const classifyRelationship = ({
  viewpointAllegianceId,
  entityAllegianceId,
}: {
  viewpointAllegianceId: EntityId | null;
  entityAllegianceId: EntityId | null;
}): Relationship => {
  if (viewpointAllegianceId == null || entityAllegianceId == null) {
    return "neutral";
  }
  return viewpointAllegianceId === entityAllegianceId ? "friendly" : "hostile";
};
