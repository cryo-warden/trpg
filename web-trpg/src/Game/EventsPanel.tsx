import {
  ComponentPropsWithoutRef,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDebugRenderer } from "../renderer";
import { EntityEvent } from "../stdb";
import { Panel } from "../structural/Panel";
import { Scroller } from "../structural/Scroller";
import { useHotkeyRef } from "../structural/useHotkeyRef";
import { useSetDynamicPanelMode } from "./context/DynamicPanelContext";
import { usePlayerEntity } from "./context/StdbContext/components";
import { useObserverComponentsEvents } from "./context/StdbContext/rendering";
import { useStdbConnection } from "./context/StdbContext/useStdb";
import "./index.css";

const compareEvents = (a: EntityEvent, b: EntityEvent) =>
  Number(a.time.microsSinceUnixEpoch - b.time.microsSinceUnixEpoch);

export const EventsPanel = (props: ComponentPropsWithoutRef<typeof Panel>) => {
  const connection = useStdbConnection();
  const { renderEvent } = useDebugRenderer();
  const playerEntity = usePlayerEntity();

  const EventDisplay = useMemo(() => {
    if (playerEntity == null) {
      return () => null;
    }
    return ({ event }: { event: EntityEvent }): ReactNode => {
      return useMemo(() => renderEvent(event), [event]);
    };
  }, [renderEvent, playerEntity]);

  const [eventSet, setEventSet] = useState(new Set<EntityEvent>());

  const events = useObserverComponentsEvents(playerEntity);

  useEffect(() => {
    setEventSet((oldEvents) => {
      if (events.length < 1) {
        return oldEvents;
      }
      return new Set([...oldEvents, ...events].toSorted(compareEvents));
    });
  }, [events]);

  const setMode = useSetDynamicPanelMode();
  const clearSelection = useCallback(() => {
    setMode("location");
    connection.reducers.deleteTarget();
  }, [setMode, connection]);

  const ref = useHotkeyRef<HTMLDivElement>("Escape");

  return (
    <Panel {...props} ref={ref} onClick={clearSelection}>
      <Scroller bottomLock>
        {Array.from(eventSet).map((event, i) => (
          <EventDisplay key={i} event={event} />
        ))}
      </Scroller>
    </Panel>
  );
};
