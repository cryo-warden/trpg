import { Scroller } from "../../../structural/Scroller";
import { EntityPanel } from "../../EntityPanel";
import "./index.css";
import { EntityId } from "../../trpg";

// The numeric hotkeys belong to the pinned-actions bar; entities are focused
// by click (or by the lone-hostile auto-focus).
export const EntitiesDisplay = ({ entityIds }: { entityIds: EntityId[] }) => {
  return (
    <Scroller className="EntitiesDisplay">
      {entityIds.map((entity) => {
        return (
          <EntityPanel key={entity} className="entityPanel" entity={entity} />
        );
      })}
    </Scroller>
  );
};
