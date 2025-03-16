import { useControllerEntity } from "./ControllerContext";
import { EntityDisplay } from "./EntityDisplay";

export const SelfDisplay = () => {
  const entity = useControllerEntity();
  if (entity == null) {
    return null;
  }

  return (
    <>
      <EntityDisplay entity={entity} />
      Self Actions
    </>
  );
};
