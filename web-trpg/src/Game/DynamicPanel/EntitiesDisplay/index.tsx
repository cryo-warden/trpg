import { Scroller } from "../../../structural/Scroller";
import { EntityPanel } from "../../EntityPanel";
import "./index.css";
import { EntityId } from "../../trpg";

// Target hotkeys (the LEFT home row) come from the caller, assigned in
// display order across the whole panel; pressing one focuses the entity
// (the panel's own click).
export const EntitiesDisplay = ({
  entityIds,
  hotkeysByEntity,
}: {
  entityIds: EntityId[];
  hotkeysByEntity?: Map<EntityId, string>;
}) => {
  return (
    <Scroller className="EntitiesDisplay">
      {entityIds.map((entity) => {
        return (
          <EntityPanel
            key={entity}
            className="entityPanel"
            entity={entity}
            hotkey={hotkeysByEntity?.get(entity)}
          />
        );
      })}
    </Scroller>
  );
};
