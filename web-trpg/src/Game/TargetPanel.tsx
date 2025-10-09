import { ComponentPropsWithRef } from "react";
import { Panel } from "../structural/Panel";
import { DynamicSelectionPanel } from "./DynamicPanel/DynamicSelectionPanel";
import { EntityPanel } from "./EntityPanel";
import { usePlayerEntity } from "./context/StdbContext/components";
import { useTarget } from "./context/TargetContext";

export const TargetPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const playerEntity = usePlayerEntity();
  const target = useTarget();
  if (target == null) {
    return <Panel {...props} />;
  }

  if (target === playerEntity) {
    return <DynamicSelectionPanel {...props} />;
  }

  return <EntityPanel {...props} entity={target} detailed />;
};
