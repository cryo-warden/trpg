import { EntityId } from "./trpg";
import { useGetName } from "./hooks/useGetName";

export const EntityName = ({ entityId }: { entityId: EntityId }) => {
  const getName = useGetName(null);
  return getName(entityId);
};
