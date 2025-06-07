import { useRef } from "react";
import { useEpComponent } from "../context/StdbContext/components";
import { EntityId } from "../trpg";
import "./EPBar.css";

export const EPBar = ({ entity }: { entity: EntityId }) => {
  const epComponent = useEpComponent(entity);
  const lastEPRatioRef = useRef(0);
  const wasEPRisingRef = useRef(true);

  if (epComponent == null) {
    return null;
  }

  if (epComponent.ep == null || epComponent.mep == null) {
    return null;
  }

  const epRatio = Math.max(0, 100 * epComponent.ep) / epComponent.mep;
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
          {epComponent.ep} / {epComponent.mep} EP
        </div>
      </div>
    </div>
  );
};
