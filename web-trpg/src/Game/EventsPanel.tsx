import {
  ComponentPropsWithoutRef,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { useDebugRenderer } from "../renderer";
import { EntityEvent } from "../stdb";
import { Panel } from "../structural/Panel";
import { Scroller } from "../structural/Scroller";
import { useHotkeyRef } from "../structural/useHotkeyRef";
import { useSetDynamicPanelMode } from "./context/DynamicPanelContext";
import { usePlayerEntity } from "./context/StdbContext/components";
import "./index.css";
import { useTableStream } from "./context/StdbContext/useTableStream";
import { useSetTarget } from "./context/TargetContext";

// const compareEvents = (a: EntityEvent, b: EntityEvent) =>
// Number(a.time.microsSinceUnixEpoch - b.time.microsSinceUnixEpoch);

export const EventsPanel = (props: ComponentPropsWithoutRef<typeof Panel>) => {
  const { renderEvent } = useDebugRenderer();
  const playerEntity = usePlayerEntity();
  const setTarget = useSetTarget();

  const EventDisplay = useMemo(() => {
    if (playerEntity == null) {
      return () => null;
    }
    const EventDisplay = ({ event }: { event: EntityEvent }): ReactNode => {
      return useMemo(() => renderEvent(event), [event]);
    };
    return EventDisplay;
  }, [renderEvent, playerEntity]);

  const eventSet = useTableStream("observableEvents", (e) => e, []);

  const setMode = useSetDynamicPanelMode();
  const clearSelection = useCallback(() => {
    setMode("location");
    setTarget(null);
  }, [setMode, setTarget]);

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
