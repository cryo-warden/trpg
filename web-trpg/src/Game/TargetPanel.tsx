import { Panel } from "../structural/Panel";
import { Scroller } from "../structural/Scroller";
import { useControllerEntity } from "./context/ControllerContext";
import { useEngine } from "./context/EngineContext";
import { useTarget } from "./context/TargetContext";
import { EntityPanel } from "./EntityPanel";

export const TargetPanel = ({ ...props }: Parameters<typeof Panel>[0]) => {
  const engine = useEngine();
  const controllerEntity = useControllerEntity();
  const { target } = useTarget();
  if (target == null) {
    return <Panel {...props} />;
  }

  if (target === controllerEntity) {
    return (
      <Panel {...props}>
        <Scroller>
          {controllerEntity.contents?.map((entity) => {
            const id = engine.world.id(entity);
            return <EntityPanel key={id} entity={entity} detailed />;
          })}
        </Scroller>
      </Panel>
    );
  }

  return <EntityPanel {...props} entity={target} detailed />;
};
