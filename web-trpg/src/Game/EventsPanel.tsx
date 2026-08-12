import {
  ComponentPropsWithoutRef,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { createDebug, useLanguageRenderer } from "../renderer";
import { EntityEvent } from "../stdb/types";
import { Panel } from "../structural/Panel";
import { Scroller } from "../structural/Scroller";
import { useHotkeyRef } from "../structural/useHotkeyRef";
import { useSetDynamicPanelMode } from "./context/DynamicPanelContext";
import { usePlayerEntity } from "./context/StdbContext/components";
import "./index.css";
import { useTableStream } from "./context/StdbContext/useTableStream";
import { useSetFocus } from "./context/FocusContext";

// const compareEvents = (a: EntityEvent, b: EntityEvent) =>
// Number(a.time.microsSinceUnixEpoch - b.time.microsSinceUnixEpoch);

export const EventsPanel = (props: ComponentPropsWithoutRef<typeof Panel>) => {
  // Language is a planned user setting; for now the app renders with the debug
  // language (English plus room for diagnostic drift).
  const { renderEvent } = useLanguageRenderer(createDebug);
  const playerEntity = usePlayerEntity();
  const setFocus = useSetFocus();

  const EventDisplay = useMemo(() => {
    if (playerEntity == null) {
      return () => null;
    }
    const EventDisplay = ({ event }: { event: EntityEvent }): ReactNode => {
      return useMemo(() => renderEvent(event), [event]);
    };
    return EventDisplay;
  }, [renderEvent, playerEntity]);

  const eventSet = useTableStream("observable_events", (e) => e, []);

  const setMode = useSetDynamicPanelMode();
  const clearSelection = useCallback(() => {
    setMode("location");
    setFocus(null);
  }, [setMode, setFocus]);

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
