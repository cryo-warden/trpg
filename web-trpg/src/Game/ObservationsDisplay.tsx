import "./index.css";

import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { useControllerEntity } from "./context/ControllerContext";
import { Observation, renderer } from "action-trpg-lib";
import { Scroller } from "../structural/Scroller";

export const ObservationsDisplay = () => {
  const rendererName = "debug";
  const { renderObservation } = useMemo(
    () => renderer[rendererName]({ React }),
    [rendererName]
  );

  const ObservationDisplay = useMemo(
    () =>
      ({ observation }: { observation: Observation }): ReactNode => {
        // TODO Fix peer dependency.
        return useMemo(
          () => renderObservation(observation),
          [observation]
        ) as any;
      },
    [renderObservation]
  );

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
        <ObservationDisplay key={i} observation={observation} />
      ))}
    </Scroller>
  );
};
