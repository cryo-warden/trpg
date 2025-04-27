import { Scroller } from "../../../structural/Scroller";
import { EntityPanel } from "../../EntityPanel";
import { useEngine } from "../../context/EngineContext";
import "./index.css";
import { useToken } from "../../../structural/mutable";
import { Entity } from "../../entities";

/** Temporary workaround to re-tokenize entity references taken from another entity. */
const WrapEntityPanel = ({
  index,
  entity,
}: {
  index: number;
  entity: Entity;
}) => {
  const entityToken = useToken(entity);
  return (
    <EntityPanel
      hotkey={index <= 10 ? `${(index + 1) % 10}` : undefined}
      className="entityPanel"
      entityToken={entityToken}
    />
  );
};

export const EntitiesDisplay = ({ entities }: { entities: Entity[] }) => {
  const engine = useEngine();
  return (
    <Scroller className="EntitiesDisplay">
      {entities.map((entity, index) => {
        const id = engine.world.id(entity);
        return <WrapEntityPanel key={id} index={index} entity={entity} />;
      })}
    </Scroller>
  );
};
