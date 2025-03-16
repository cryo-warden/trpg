import { useControllerEntity } from "./ControllerContext";
import { useEngine } from "./EngineContext";
import { EntityDisplay } from "./EntityDisplay";
import { Panel } from "../structural/Panel";
import { useWatchable } from "../structural/useWatchable";

export const EntitiesDisplay = () => {
  const engine = useEngine();
  useWatchable(engine);
  const selfEntity = useControllerEntity();
  const entities = engine.world.with("hp");
  return (
    <div>
      {Array.from(entities).map((entity, i) => {
        if (entity === selfEntity) {
          return null;
        }

        return (
          <Panel key={i}>
            <EntityDisplay entity={entity} />
          </Panel>
        );
      })}
    </div>
  );
};
