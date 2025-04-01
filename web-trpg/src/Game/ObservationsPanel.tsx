import "./index.css";

import { Observation, renderer } from "action-trpg-lib";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Panel, PanelProps } from "../structural/Panel";
import { Scroller } from "../structural/Scroller";
import { useHotkeyRef } from "../structural/useHotkeyRef";
import { useControllerEntity } from "./context/ControllerContext";
import { useSetDynamicPanelMode } from "./context/DynamicPanelContext";
import { useTarget } from "./context/TargetContext";

export const ObservationsPanel = (props: PanelProps) => {
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

  const setMode = useSetDynamicPanelMode();
  const { setTarget } = useTarget();
  const clearSelection = useCallback(() => {
    setMode("location");
    setTarget(null);
  }, [setMode, setTarget]);

  const ref = useHotkeyRef<HTMLDivElement>("Escape");

  return (
    <Panel {...props} ref={ref} onClick={clearSelection}>
      <Scroller bottomLock>
        {observations.map((observation, i) => (
          <ObservationDisplay key={i} observation={observation} />
        ))}
      </Scroller>
    </Panel>
  );
};
