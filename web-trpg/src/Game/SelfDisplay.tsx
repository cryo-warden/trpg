import "./SelfDisplay.css";
import { action } from "action-trpg-lib";
import { useControllerEntity } from "./context/ControllerContext";
import { EntityDisplay } from "./EntityDisplay";
import { ActionButton } from "./ActionButton";
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
      <div className="ActionBar">
        <ActionButton action={action.recover} target={entity}>
          Recover
        </ActionButton>
        <ActionButton action={action.guard} target={entity}>
          Guard
        </ActionButton>
        <ActionButton action={action.fancyFootwork} target={entity}>
          Fancy Footwork
        </ActionButton>
        <ActionButton action={action.doubleStrike}>Double Strike</ActionButton>
        <ActionButton action={action.powerStrike}>Power Strike</ActionButton>
        <ActionButton action={action.tripleStrike}>Triple Strike</ActionButton>
        <ActionButton action={action.recover}>Restore</ActionButton>
      </div>
    </div>
  );
};
