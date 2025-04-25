import { useRef } from "react";
import { WithEntity } from "../EntityComponent";
import "./HPBar.css";

export const HPBar = WithEntity(({ entityToken }) => {
  const lastHPRatioRef = useRef(0);
  const wasHPRisingRef = useRef(true);

  if (entityToken.value.hp == null || entityToken.value.mhp == null) {
    return null;
  }

  const hpRatio =
    Math.max(0, 100 * entityToken.value.hp) / entityToken.value.mhp;
  const isHPRising =
    hpRatio === lastHPRatioRef.current
      ? wasHPRisingRef.current
      : hpRatio >= lastHPRatioRef.current;
  lastHPRatioRef.current = hpRatio;
  wasHPRisingRef.current = isHPRising;
  const cdpRatio =
    Math.max(0, 100 * (entityToken.value.cdp ?? 0)) / entityToken.value.mhp;

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
        <div>
          {(entityToken.value.cdp ?? 0) > 0 && `${entityToken.value.cdp} CDP`}
        </div>
        <div>
          {entityToken.value.hp} / {entityToken.value.mhp} HP
        </div>
      </div>
    </div>
  );
});
