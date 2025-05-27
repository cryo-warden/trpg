import { Scroller } from "../../../structural/Scroller";
import { EntityPanel } from "../../EntityPanel";
import "./index.css";
import { EntityId } from "../../trpg";

/** Temporary workaround to re-tokenize entity references taken from another entity. */
const WrapEntityPanel = ({
  index,
  entity,
}: {
  index: number;
  entity: EntityId;
}) => {
  return (
    <EntityPanel
      hotkey={index < 10 ? `${(index + 1) % 10}` : undefined}
      className="entityPanel"
      entity={entity}
    />
  );
};

export const EntitiesDisplay = ({ entityIds }: { entityIds: EntityId[] }) => {
  return (
    <Scroller className="EntitiesDisplay">
      {entityIds.map((entity, index) => {
        return <WrapEntityPanel key={entity} index={index} entity={entity} />;
      })}
    </Scroller>
  );
};
