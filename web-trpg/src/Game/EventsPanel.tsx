import "./index.css";

import { EntityEvent, renderer } from "action-trpg-lib";
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

export const EventsPanel = (props: ComponentPropsWithoutRef<typeof Panel>) => {
  const rendererName = "debug";
  const { renderEvent } = useMemo(
    () => renderer[rendererName]({ React }),
    [rendererName]
  );
  const controllerEntity = useControllerEntity();

  const EventDisplay = useMemo(() => {
    if (controllerEntity == null) {
      return () => null;
    }
    return ({ event }: { event: EntityEvent }): ReactNode => {
      // TODO Fix peer dependency.
      return useMemo(
        () => renderEvent(controllerEntity, event),
        [event]
      ) as any;
    };
  }, [renderEvent, controllerEntity]);

  const [events, setEvents] = useState<EntityEvent[]>([]);
  useEffect(() => {
    setEvents((events) => {
      if (controllerEntity?.observer == null) {
        return events;
      }
      return [...events, ...(controllerEntity.observer ?? [])];
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
        {events.map((event, i) => (
          <EventDisplay key={i} event={event} />
        ))}
      </Scroller>
    </Panel>
  );
};
