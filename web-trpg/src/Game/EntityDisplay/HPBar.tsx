import { useRef } from "react";
import { WithEntity } from "../EntityComponent";
import "./HPBar.css";

export const HPBar = WithEntity(({ entity }) => {
  const lastHPRatioRef = useRef(0);
  const wasHPRisingRef = useRef(true);

  if (entity.hp == null || entity.mhp == null) {
    return null;
  }

  const hpRatio = Math.max(0, 100 * entity.hp) / entity.mhp;
  const isHPRising =
    hpRatio === lastHPRatioRef.current
      ? wasHPRisingRef.current
      : hpRatio >= lastHPRatioRef.current;
  lastHPRatioRef.current = hpRatio;
  wasHPRisingRef.current = isHPRising;
  const cdpRatio = Math.max(0, 100 * (entity.cdp ?? 0)) / entity.mhp;

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
      <div className="cdp" style={{ width: `${cdpRatio}%` }}></div>
      <div className="overlay">
        <div>{(entity?.cdp ?? 0) > 0 && `${entity.cdp} CDP`}</div>
        <div>
          {entity.hp} / {entity.mhp} HP
        </div>
      </div>
    </div>
  );
});
