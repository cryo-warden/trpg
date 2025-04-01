import { ComponentPropsWithRef } from "react";
import { Panel } from "../structural/Panel";
import { useControllerEntity } from "./context/ControllerContext";
import { useTarget } from "./context/TargetContext";
import { DynamicSelectionPanel } from "./DynamicPanel/DynamicSelectionPanel";
import { EntityPanel } from "./EntityPanel";

export const TargetPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const controllerEntity = useControllerEntity();
  const { target } = useTarget();
  if (target == null) {
    return <Panel {...props} />;
  }

  if (target === controllerEntity) {
    return <DynamicSelectionPanel {...props} />;
  }

  return <EntityPanel {...props} entity={target} detailed />;
};
