import "./SelfDisplay.css";
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
        <ActionButton action={action.doubleStrike}>Double Strike</ActionButton>
        <ActionButton action={action.powerStrike}>Power Strike</ActionButton>
        <ActionButton action={action.tripleStrike}>Triple Strike</ActionButton>
        <ActionButton action={action.recover}>Restore</ActionButton>
      </div>
    </>
  );
};
