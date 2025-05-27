import { useCallback, useRef, useSyncExternalStore } from "react";
import { WithEntity } from "../EntityComponent";
import "./HPBar.css";
import { useStdbConnection } from "../context/StdbContext";

export const HPBar = WithEntity(({ entity }) => {
  const connection = useStdbConnection();
  const lastHPRatioRef = useRef(0);
  const wasHPRisingRef = useRef(true);

  const subscribe = useCallback(
    (refresh: () => void) => {
      connection.db.hpComponents.onInsert(refresh);
      connection.db.hpComponents.onUpdate(refresh);
      connection.db.hpComponents.onDelete(refresh);
      return () => {
        connection.db.hpComponents.removeOnInsert(refresh);
        connection.db.hpComponents.removeOnUpdate(refresh);
        connection.db.hpComponents.removeOnDelete(refresh);
      };
    },
    [connection]
  );

  // WIP Lookup entity.
  const hpComponent = useSyncExternalStore(subscribe, () =>
    connection.db.hpComponents.entityId.find(entity)
  );

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
        <div>
          {hpComponent.hp} / {hpComponent.mhp} HP
        </div>
      </div>
    </div>
  );
});
