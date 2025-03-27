import "./index.css";

import { useEffect, useState } from "react";
import { useControllerEntity } from "./context/ControllerContext";
import { Observation } from "action-trpg-lib";
import { Scroller } from "../structural/Scroller";

export const ObservationsDisplay = () => {
  const controllerEntity = useControllerEntity();
  const [observations, setObservations] = useState<Observation[]>([]);
  useEffect(() => {
    setObservations((observations) => {
      if (controllerEntity?.observer == null) {
        return observations;
      }
      return [...observations, ...(controllerEntity.observer ?? [])];
    });
  }, [controllerEntity?.observer]);

  return (
    <Scroller bottomLock>
      {observations.map((observation, i) => (
        <div key={i}>{observation.message}</div>
      ))}
    </Scroller>
  );
};
