import "./index.css";
import { WithEntity } from "../EntityComponent";
import { HPBar } from "./HPBar";
import { useWatchable } from "../../structural/useWatchable";
import { EPBar } from "./EPBar";
import { ActionButton } from "../ActionButton";

export const EntityDisplay = WithEntity<{ detailed?: boolean }>(
  ({ entity, detailed }) => {
    useWatchable(entity);
    return (
      <div className="EntityDisplay">
        <div>{entity.name}</div>
        <HPBar entity={entity} />
        <EPBar entity={entity} />
        {detailed && <></>}
        {entity.path != null && (
          <>
            <div>{entity.path.destination.name}</div>
            <ActionButton
              action={{ effectSequence: [{ type: "move" }] }}
              target={entity}
            >
              Move
            </ActionButton>
          </>
        )}
      </div>
    );
  }
);
