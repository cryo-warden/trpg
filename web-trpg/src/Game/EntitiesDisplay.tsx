import "./EntitiesDisplay.css";

import { useControllerEntity } from "./context/ControllerContext";
import { EntityPanel } from "./EntityPanel";
import { useEngine } from "./context/EngineContext";
import { Entity } from "action-trpg-lib";
import { Scroller } from "../structural/Scroller";

const weighEntity = (entity: Entity) =>
  (entity.controller != null && !entity.unconscious ? 1 << 7 : 0) |
  (entity.path != null ? 1 << 6 : 0) |
  (entity.mhp != null ? 1 << 5 : 0) |
  (entity.contents != null ? 1 << 4 : 0) |
  (entity.takeable != null ? 1 << 3 : 0);

export const EntitiesDisplay = () => {
  const engine = useEngine();
  const selfEntity = useControllerEntity();
  const entities = selfEntity?.location?.contents ?? [];
  const sortedEntities = entities
    .filter((entity) => entity !== selfEntity)
    .toSorted((a, b) => weighEntity(b) - weighEntity(a));
  return (
    <div className="EntitiesDisplay">
      <Scroller>
        {sortedEntities.map((entity, index) => {
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
    </div>
  );
};
