import { useWatchable } from "./EngineContext";
import { EntityComponent } from "./EntityComponent";
import "./HPBar.css";

export const HPBar: EntityComponent = ({ entity }) => {
  useWatchable(entity);
  if (entity.hp == null || entity.mhp == null) {
    return null;
  }
  return (
    <div className="HPBar">
      <div
        className="hp"
        style={{ width: `${(100 * entity.hp) / entity.mhp}%` }}
      ></div>
      <div
        className="cdp"
        style={{ width: `${(100 * (entity.cdp ?? 0)) / entity.mhp}%` }}
      ></div>
    </div>
  );
};
