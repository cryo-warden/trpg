import { useCallback } from "react";
import { Panel } from "../structural/Panel";
import { Scroller } from "../structural/Scroller";
import { useControllerEntity } from "./context/ControllerContext";
import { useSetDynamicPanelMode } from "./context/DynamicPanelContext";
import { useTarget } from "./context/TargetContext";
import { EntityPanel } from "./EntityPanel";

const SelfTargetPanel = ({ ...props }) => {
  const controllerEntity = useControllerEntity();
  const setMode = useSetDynamicPanelMode();
  const setLocationMode = useCallback(() => {
    setMode("location");
  }, [setMode]);
  const setInventoryMode = useCallback(() => {
    setMode("inventory");
  }, [setMode]);
  if (controllerEntity == null) {
    return null;
  }

  // TODO Add hotkeys and refactor ActionButton to create a Button component in structures directory.
  return (
    <Panel {...props}>
      <Scroller>
        <button onClick={setLocationMode}>View Room</button>
        <button onClick={setInventoryMode}>View Items</button>
      </Scroller>
    </Panel>
  );
};

export const TargetPanel = ({ ...props }: Parameters<typeof Panel>[0]) => {
  const controllerEntity = useControllerEntity();
  const { target } = useTarget();
  if (target == null) {
    return <Panel {...props} />;
  }

  if (target === controllerEntity) {
    return <SelfTargetPanel {...props} />;
  }

  return <EntityPanel {...props} entity={target} detailed />;
};
