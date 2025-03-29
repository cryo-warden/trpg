import { Panel } from "../structural/Panel";
import { EntityPanel } from "./EntityPanel";
import "./SelfPanel.css";
import { useControllerEntity } from "./context/ControllerContext";

export const SelfPanel = ({ ...props }: Parameters<typeof Panel>[0]) => {
  const entity = useControllerEntity();
  if (entity == null) {
    return null;
  }

  return <EntityPanel {...props} entity={entity} detailed hotkey="p" />;
};
