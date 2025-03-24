import "./EntitiesDisplay.css";

import { useControllerEntity } from "./context/ControllerContext";
import { EntityDisplay } from "./EntityDisplay";
import { Panel } from "../structural/Panel";
import { useTarget } from "./context/TargetContext";
import { useMemo } from "react";
import { useEngine } from "./context/EngineContext";
import { Entity } from "action-trpg-lib";
import { Scroller } from "../structural/Scroller";

const weighEntity = (entity: Entity) =>
  ((entity.controller != null ? 1 : 0) << 7) +
  ((entity.path != null ? 1 : 0) << 6) +
  ((entity.mhp != null ? 1 : 0) << 5) +
  ((entity.contents != null ? 1 : 0) << 4) +
  ((entity.takeable != null ? 1 : 0) << 3);

export const EntitiesDisplay = () => {
  const engine = useEngine();
  const { setTarget } = useTarget();
  const selfEntity = useControllerEntity();
  const entities = selfEntity?.location?.contents ?? [];
  const sortedEntities = useMemo(() => {
    return entities.toSorted((a, b) => weighEntity(b) - weighEntity(a));
  }, [entities]);
  return (
    <div className="EntitiesDisplay">
      <Scroller>
        {sortedEntities.map((entity) => {
          if (entity === selfEntity) {
            return null;
          }

          const id = engine.world.id(entity);
          return (
            <Panel
              key={id}
              className="entityPanel"
              onClick={() => setTarget(entity)}
            >
              <EntityDisplay entity={entity} />
            </Panel>
          );
        })}
      </Scroller>
    </div>
  );
};
