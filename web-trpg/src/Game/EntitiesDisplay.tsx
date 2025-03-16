import { useControllerEntity } from "./context/ControllerContext";
import { EntityDisplay } from "./EntityDisplay";
import { Panel } from "../structural/Panel";
import { useTarget } from "./context/TargetContext";

export const EntitiesDisplay = () => {
  const { setTarget } = useTarget();
  const selfEntity = useControllerEntity();
  const entities = selfEntity?.location?.contents ?? [];
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
