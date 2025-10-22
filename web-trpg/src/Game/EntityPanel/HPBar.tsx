import { useHpComponent } from "../context/StdbContext/components";
import { EntityId } from "../trpg";
import "./HPBar.css";
import { useIsRising } from "../../structural/useIsRising";

export const HPBar = ({ entity }: { entity: EntityId }) => {
  const hpComponent = useHpComponent(entity);
  const hpRatio =
    Math.max(0, 100 * (hpComponent?.hp ?? 0)) / (hpComponent?.mhp ?? 1);
  const isRising = useIsRising(0, hpRatio);

  if (hpComponent == null || hpRatio == null) {
    return null;
  }

  return (
    <div className="HPBar">
      <div
        className="smooth-hp"
        style={{
          width: `${hpRatio}%`,
          transitionDuration: isRising ? "0.25s" : "1s",
        }}
      ></div>
      <div
        className="hp"
        style={{
          width: `${hpRatio}%`,
          transitionDuration: isRising ? "1s" : "0.25s",
        }}
      ></div>
      <div className="overlay">
        <div></div>
        <div>
          {hpComponent.hp} / {hpComponent.mhp} HP
        </div>
      </div>
    </div>
  );
};
