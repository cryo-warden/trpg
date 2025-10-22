import { useEpComponent } from "../context/StdbContext/components";
import { EntityId } from "../trpg";
import "./EPBar.css";
import { useIsRising } from "../../structural/useIsRising";

export const EPBar = ({ entity }: { entity: EntityId }) => {
  const epComponent = useEpComponent(entity);
  const epRatio =
    Math.max(0, 100 * (epComponent?.ep ?? 0)) / (epComponent?.mep ?? 1);
  const isRising = useIsRising(0, epRatio ?? 0);

  if (epComponent == null || epRatio == null) {
    return null;
  }

  return (
    <div className="EPBar">
      <div
        className="smooth-ep"
        style={{
          width: `${epRatio}%`,
          transitionDuration: isRising ? "0.25s" : "1s",
        }}
      ></div>
      <div
        className="ep"
        style={{
          width: `${epRatio}%`,
          transitionDuration: isRising ? "1s" : "0.25s",
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
