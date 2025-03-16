import { WithEntity } from "./EntityComponent";
import { HPBar } from "./HPBar";
import { useWatchable } from "../structural/useWatchable";

export const EntityDisplay = WithEntity(({ entity }) => {
  useWatchable(entity);
  return (
    <div className="EntityDisplay">
      <div>{entity.name}</div>
      <HPBar entity={entity} />
    </div>
  );
});
