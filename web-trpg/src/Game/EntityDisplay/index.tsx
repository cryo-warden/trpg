import "./index.css";
import { WithEntity } from "../EntityComponent";
import { HPBar } from "./HPBar";
import { useWatchable } from "../../structural/useWatchable";
import { EPBar } from "./EPBar";
import { ActionButton } from "../ActionButton";
import { recommendActions } from "action-trpg-lib/src/structures/Action";
import { useControllerEntity } from "../context/ControllerContext";

export const EntityDisplay = WithEntity<{ detailed?: boolean }>(
  ({ entity, detailed }) => {
    useWatchable(entity);
    const controllerEntity = useControllerEntity();
    const recommendedActions =
      controllerEntity && recommendActions(controllerEntity, entity);

    return (
      <div className="EntityDisplay">
        <div>{entity.name}</div>
        <HPBar entity={entity} />
        <EPBar entity={entity} />
        {detailed && <></>}
        {recommendedActions?.map((action, i) => (
          <ActionButton key={i} action={action} target={entity} />
        ))}
      </div>
    );
  }
);
