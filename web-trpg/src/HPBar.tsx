import { WithEntity } from "./EntityComponent";
import "./HPBar.css";

export const HPBar = WithEntity(({ entity }) => {
  if (entity.hp == null || entity.mhp == null) {
    return null;
  }

  return (
    <div className="HPBar">
      <div
        className="hp"
        style={{
          width: `${Math.max(0, 100 * entity.hp) / entity.mhp}%`,
        }}
      ></div>
      <div
        className="cdp"
        style={{
          width: `${Math.max(0, 100 * (entity.cdp ?? 0)) / entity.mhp}%`,
        }}
      ></div>
    </div>
  );
});
