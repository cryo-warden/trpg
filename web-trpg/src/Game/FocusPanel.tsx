import { ComponentPropsWithRef } from "react";
import { Panel } from "../structural/Panel";
import { DynamicSelectionPanel } from "./DynamicPanel/DynamicSelectionPanel";
import { EntityPanel } from "./EntityPanel";
import { useFocus } from "./context/FocusContext";
import { usePlayerEntity } from "./context/StdbContext/components";

/** The details of the focused entity — the inspection cursor's view. */
export const FocusPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const focus = useFocus();
  const playerEntity = usePlayerEntity();
  if (focus == null) {
    return <Panel {...props} />;
  }
  if (focus === playerEntity) {
    return <DynamicSelectionPanel {...props} />;
  }
  return <EntityPanel {...props} entity={focus} detailed />;
};
