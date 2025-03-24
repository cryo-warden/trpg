import { Panel } from "../structural/Panel";
import { Scroller } from "../structural/Scroller";
import { useControllerEntity } from "./context/ControllerContext";
import { useEngine } from "./context/EngineContext";
import { useTarget } from "./context/TargetContext";
import { EntityDisplay } from "./EntityDisplay";

export const TargetDisplay = () => {
  const engine = useEngine();
  const controllerEntity = useControllerEntity();
  const { target } = useTarget();
  if (target == null) {
    return null;
  }

  if (target === controllerEntity) {
    return (
      <Scroller>
        {controllerEntity.contents?.map((entity) => {
          const id = engine.world.id(entity);
          return (
            <Panel key={id}>
              <EntityDisplay entity={entity} detailed />
            </Panel>
          );
        })}
      </Scroller>
    );
  }

  return <EntityDisplay entity={target} detailed />;
};
