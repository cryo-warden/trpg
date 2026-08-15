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
  const setStancesMode = useCallback(() => {
    setMode("stances");
  }, [setMode]);

  // DIGITS for the menu modes: the home row belongs to targeting (left)
  // and actions (right), and the number row is free since the bar left
  // its numeric hotkeys behind.
  return (
    <Panel {...props}>
      <Scroller>
        <Button hotkey="1" onClick={setLocationMode}>
          Room
        </Button>
        <Button hotkey="2" onClick={setInventoryMode}>
          Items
        </Button>
        <Button hotkey="3" onClick={setEquipmentMode}>
          Equipment
        </Button>
        <Button hotkey="4" onClick={setStancesMode}>
          Stances
        </Button>
      </Scroller>
    </Panel>
  );
};
