import { Panel } from "../structural/Panel";
import { EntityPanel } from "./EntityPanel";
import "./SelfPanel.css";
import { useControllerEntity } from "./context/ControllerContext";
import { useTarget } from "./context/TargetContext";

export const SelfPanel = ({ ...props }: Parameters<typeof Panel>[0]) => {
  const entity = useControllerEntity();
  const { setTarget } = useTarget();
  if (entity == null) {
    return null;
  }

  return (
    <EntityPanel
      {...props}
      entity={entity}
      detailed
      onClick={() => setTarget(entity)}
    />
  );
};
