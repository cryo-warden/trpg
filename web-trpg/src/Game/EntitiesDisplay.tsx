import { useControllerEntity } from "./context/ControllerContext";
import { useEngine } from "./context/EngineContext";
import { EntityDisplay } from "./EntityDisplay";
import { Panel } from "../structural/Panel";
import { useWatchable } from "../structural/useWatchable";
import { useTarget } from "./context/TargetContext";

export const EntitiesDisplay = () => {
  const engine = useEngine();
  const { setTarget } = useTarget();
  useWatchable(engine);
  const selfEntity = useControllerEntity();
  const entities = engine.world.with();
  return (
    <div>
      {Array.from(entities).map((entity, i) => {
        if (entity === selfEntity) {
          return null;
        }

        return (
          <Panel key={i} onClick={() => setTarget(entity)}>
            <EntityDisplay entity={entity} />
          </Panel>
        );
      })}
    </div>
  );
};
