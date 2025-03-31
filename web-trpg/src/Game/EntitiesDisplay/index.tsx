import "./index.css";

import { EntityPanel } from "../EntityPanel";
import { useEngine } from "../context/EngineContext";
import { Entity } from "action-trpg-lib";
import { Scroller } from "../../structural/Scroller";

export const EntitiesDisplay = ({ entities }: { entities: Entity[] }) => {
  const engine = useEngine();
  return (
    <Scroller className="EntitiesDisplay">
      {entities.map((entity, index) => {
        const id = engine.world.id(entity);
        return (
          <EntityPanel
            key={id}
            hotkey={index <= 10 ? `${(index + 1) % 10}` : undefined}
            className="entityPanel"
            entity={entity}
          />
        );
      })}
    </Scroller>
  );
};
