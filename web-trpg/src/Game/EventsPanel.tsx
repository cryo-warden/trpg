import "./index.css";

import { renderer } from "action-trpg-lib";
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
import { useControllerEntityToken } from "./context/ControllerContext";
import { useSetDynamicPanelMode } from "./context/DynamicPanelContext";
import { useTarget } from "./context/TargetContext";
import { useEngine } from "./context/EngineContext";
import { EntityEvent } from "./trpg";

export const EventsPanel = (props: ComponentPropsWithoutRef<typeof Panel>) => {
  const engine = useEngine();
  const rendererName = "debug";
  const { renderEvent } = useMemo(
    () => renderer[rendererName]({ engine, React }),
    [engine, rendererName]
  );
  const controllerEntityToken = useControllerEntityToken();

  const EventDisplay = useMemo(() => {
    if (controllerEntityToken.value == null) {
      return () => null;
    }
    return ({ event }: { event: EntityEvent }): ReactNode => {
      // TODO Fix peer dependency.
      return useMemo(
        () => renderEvent(controllerEntityToken.value, event),
        [event]
      ) as any;
    };
  }, [renderEvent, controllerEntityToken]);

  const [events, setEvents] = useState<EntityEvent[]>([]);
  useEffect(() => {
    setEvents((events) => {
      if (controllerEntityToken.value?.observer == null) {
        return events;
      }
      return [...events, ...(controllerEntityToken.value.observer ?? [])];
    });
  }, [
    // We count on the observer itself being replaced between game iterations.
    controllerEntityToken.value?.observer,
  ]);

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
        {events.map((event, i) => (
          <EventDisplay key={i} event={event} />
        ))}
      </Scroller>
    </Panel>
  );
};
