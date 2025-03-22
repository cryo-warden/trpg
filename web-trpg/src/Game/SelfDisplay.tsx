import "./SelfDisplay.css";
import { useControllerEntity } from "./context/ControllerContext";
import { EntityDisplay } from "./EntityDisplay";
import { useTarget } from "./context/TargetContext";

export const SelfDisplay = () => {
  const entity = useControllerEntity();
  const { setTarget } = useTarget();
  if (entity == null) {
    return null;
  }

  return (
    <div onClick={() => setTarget(entity)}>
      <EntityDisplay entity={entity} detailed />
    </div>
  );
};
