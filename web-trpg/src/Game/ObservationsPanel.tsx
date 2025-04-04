import "./index.css";

import { Observation, renderer } from "action-trpg-lib";
import React, {
  ComponentPropsWithoutRef,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Panel } from "../structural/Panel";
import { Scroller } from "../structural/Scroller";
import { useHotkeyRef } from "../structural/useHotkeyRef";
import { useControllerEntity } from "./context/ControllerContext";
import { useSetDynamicPanelMode } from "./context/DynamicPanelContext";
import { useTarget } from "./context/TargetContext";

export const ObservationsPanel = (
  props: ComponentPropsWithoutRef<typeof Panel>
) => {
  const rendererName = "debug";
  const { renderObservation } = useMemo(
    () => renderer[rendererName]({ React }),
    [rendererName]
  );
  const controllerEntity = useControllerEntity();

  const ObservationDisplay = useMemo(() => {
    if (controllerEntity == null) {
      return () => null;
    }
    return ({ observation }: { observation: Observation }): ReactNode => {
      // TODO Fix peer dependency.
      return useMemo(
        () => renderObservation(controllerEntity, observation),
        [observation]
      ) as any;
    };
  }, [renderObservation, controllerEntity]);

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
