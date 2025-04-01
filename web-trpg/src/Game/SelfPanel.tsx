import { PanelProps } from "../structural/Panel";
import { EntityPanel } from "./EntityPanel";
import "./SelfPanel.css";
import { useControllerEntity } from "./context/ControllerContext";

export const SelfPanel = (props: PanelProps) => {
  const entity = useControllerEntity();
  if (entity == null) {
    return null;
  }

  return <EntityPanel {...props} entity={entity} detailed hotkey="p" />;
};
