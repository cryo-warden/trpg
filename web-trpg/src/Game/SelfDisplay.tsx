import { useControllerEntity } from "./context/ControllerContext";
import { EntityDisplay } from "./EntityDisplay";

export const SelfDisplay = () => {
  const entity = useControllerEntity();
  if (entity == null) {
    return null;
  }

  return (
    <>
      <EntityDisplay entity={entity} detailed />
      Self Actions
    </>
  );
};
