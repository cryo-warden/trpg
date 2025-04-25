import { ComponentPropsWithRef } from "react";
import { Panel } from "../structural/Panel";
import { useControllerEntityToken } from "./context/ControllerContext";
import { useTarget } from "./context/TargetContext";
import { DynamicSelectionPanel } from "./DynamicPanel/DynamicSelectionPanel";
import { EntityPanel } from "./EntityPanel";

export const TargetPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const controllerEntityToken = useControllerEntityToken();
  const { targetToken } = useTarget();
  if (targetToken.value == null) {
    return <Panel {...props} />;
  }

  if (targetToken.value === controllerEntityToken.value) {
    return <DynamicSelectionPanel {...props} />;
  }

  return <EntityPanel {...props} entityToken={targetToken} detailed />;
};
