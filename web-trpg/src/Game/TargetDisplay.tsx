import { useEngine } from "./context/EngineContext";
import { useTarget } from "./context/TargetContext";
import { EntityDisplay } from "./EntityDisplay";

export const TargetDisplay = () => {
  const engine = useEngine();
  const { target } = useTarget();
  if (target == null) {
    return null;
  }
  // Use a different key per entity to prevent unwanted state preservation.
  const id = engine.world.id(target);
  return <EntityDisplay key={id} entity={target} detailed />;
};
