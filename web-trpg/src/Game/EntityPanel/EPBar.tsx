import { useRef } from "react";
import { WithEntity } from "../EntityComponent";
import "./EPBar.css";

export const EPBar = WithEntity(({ entity }) => {
  const lastEPRatioRef = useRef(0);
  const wasEPRisingRef = useRef(true);

  if (entity.ep == null || entity.mep == null) {
    return null;
  }

  const epRatio = Math.max(0, 100 * entity.ep) / entity.mep;
  const isEPRising =
    epRatio === lastEPRatioRef.current
      ? wasEPRisingRef.current
      : epRatio >= lastEPRatioRef.current;
  lastEPRatioRef.current = epRatio;
  wasEPRisingRef.current = isEPRising;

  return (
    <div className="EPBar">
      <div
        className="smooth-ep"
        style={{
          width: `${epRatio}%`,
          transitionDuration: isEPRising ? "0.25s" : "1s",
        }}
      ></div>
      <div
        className="ep"
        style={{
          width: `${epRatio}%`,
          transitionDuration: isEPRising ? "1s" : "0.25s",
        }}
      ></div>
      <div className="overlay">
        <div></div>
        <div>
          {entity.ep} / {entity.mep} EP
        </div>
      </div>
    </div>
  );
});
