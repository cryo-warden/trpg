import { useCallback } from "react";
import { Button } from "../structural/Button";
import { Panel, PanelProps } from "../structural/Panel";
import { Scroller } from "../structural/Scroller";
import { useControllerEntity } from "./context/ControllerContext";
import { useSetDynamicPanelMode } from "./context/DynamicPanelContext";
import { useTarget } from "./context/TargetContext";
import { EntityPanel } from "./EntityPanel";

const SelfTargetPanel = (props: PanelProps) => {
  const setMode = useSetDynamicPanelMode();
  const setLocationMode = useCallback(() => {
    setMode("location");
  }, [setMode]);
  const setInventoryMode = useCallback(() => {
    setMode("inventory");
  }, [setMode]);
  const setEquipmentMode = useCallback(() => {
    setMode("equipment");
  }, [setMode]);

  // TODO Add hotkeys and refactor ActionButton to create a Button component in structures directory.
  return (
    <Panel {...props}>
      <Scroller>
        <Button hotkey="r" onClick={setLocationMode}>
          Room
        </Button>
        <Button hotkey="i" onClick={setInventoryMode}>
          Items
        </Button>
        <Button hotkey="e" onClick={setEquipmentMode}>
          Equipment
        </Button>
      </Scroller>
    </Panel>
  );
};

export const TargetPanel = (props: PanelProps) => {
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
