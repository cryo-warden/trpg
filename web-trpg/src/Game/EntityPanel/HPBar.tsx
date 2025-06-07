import { useRef } from "react";
import { useHpComponent } from "../context/StdbContext/components";
import { EntityId } from "../trpg";
import "./HPBar.css";

export const HPBar = ({ entity }: { entity: EntityId }) => {
  const hpComponent = useHpComponent(entity);
  const lastHPRatioRef = useRef(0);
  const wasHPRisingRef = useRef(true);

  if (hpComponent == null) {
    return null;
  }

  const hpRatio = Math.max(0, 100 * hpComponent.hp) / hpComponent.mhp;
  const isHPRising =
    hpRatio === lastHPRatioRef.current
      ? wasHPRisingRef.current
      : hpRatio >= lastHPRatioRef.current;
  lastHPRatioRef.current = hpRatio;
  wasHPRisingRef.current = isHPRising;

  return (
    <div className="HPBar">
      <div
        className="smooth-hp"
        style={{
          width: `${hpRatio}%`,
          transitionDuration: isHPRising ? "0.25s" : "1s",
        }}
      ></div>
      <div
        className="hp"
        style={{
          width: `${hpRatio}%`,
          transitionDuration: isHPRising ? "1s" : "0.25s",
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
