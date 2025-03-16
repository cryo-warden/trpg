import { action } from "action-trpg-lib";
import { useControllerEntity } from "./context/ControllerContext";
import { EntityDisplay } from "./EntityDisplay";
import { ActionButton } from "./ActionButton";

export const SelfDisplay = () => {
  const entity = useControllerEntity();
  if (entity == null) {
    return null;
  }

  return (
    <>
      <EntityDisplay entity={entity} detailed />
      <div className="ActionBar">
        <ActionButton action={action.recover} target={entity}>
          Recover
        </ActionButton>
        <ActionButton action={action.doubleStrike}>
          Double Double Strike Strike
        </ActionButton>
      </div>
    </>
  );
};
