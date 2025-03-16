import "./index.css";
import { WithEntity } from "../EntityComponent";
import { HPBar } from "./HPBar";
import { useWatchable } from "../../structural/useWatchable";
import { EPBar } from "./EPBar";

export const EntityDisplay = WithEntity<{ detailed?: boolean }>(
  ({ entity, detailed }) => {
    useWatchable(entity);
    return (
      <div className="EntityDisplay">
        <div>{entity.name}</div>
        <HPBar entity={entity} />
        <EPBar entity={entity} />
        {detailed && <></>}
      </div>
    );
  }
);
