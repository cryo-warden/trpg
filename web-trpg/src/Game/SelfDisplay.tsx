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
        <ActionButton action={action.recover} target={entity} />
        <ActionButton action={action.guard} target={entity} />
        <ActionButton action={action.fancyFootwork} target={entity} />
        <ActionButton action={action.doubleStrike} />
        <ActionButton action={action.powerStrike} />
        <ActionButton action={action.tripleStrike} />
        <ActionButton action={action.recover} />
      </div>
    </div>
  );
};
