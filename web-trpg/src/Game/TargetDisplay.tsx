import { useTarget } from "./context/TargetContext";
import { EntityDisplay } from "./EntityDisplay";

export const TargetDisplay = () => {
  const { target } = useTarget();
  if (target == null) {
    return null;
  }
  return <EntityDisplay entity={target} detailed />;
};
