import { ComponentPropsWithRef, useCallback } from "react";
import { Button } from "../../structural/Button";
import { Panel } from "../../structural/Panel";
import { Scroller } from "../../structural/Scroller";
import { useSetDynamicPanelMode } from "../context/DynamicPanelContext";

export const DynamicSelectionPanel = (
  props: ComponentPropsWithRef<typeof Panel>
) => {
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
  const setStatsMode = useCallback(() => {
    setMode("stats");
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
        <Button hotkey="s" onClick={setStatsMode}>
          Stats
        </Button>
      </Scroller>
    </Panel>
  );
};
