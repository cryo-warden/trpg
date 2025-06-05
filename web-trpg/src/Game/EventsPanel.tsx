import "./index.css";

import {
  ComponentPropsWithoutRef,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Panel } from "../structural/Panel";
import { Scroller } from "../structural/Scroller";
import { useHotkeyRef } from "../structural/useHotkeyRef";
import { useSetDynamicPanelMode } from "./context/DynamicPanelContext";
import { renderer } from "../renderer";
import {
  useAllegianceComponents,
  useBaselineComponents,
  useBaselines,
  usePlayerEntity,
  useStdbConnection,
  useTraits,
  useTraitsComponents,
} from "./context/StdbContext";
import { Event } from "../stdb/event_type";

export const EventsPanel = (props: ComponentPropsWithoutRef<typeof Panel>) => {
  const connection = useStdbConnection();
  const rendererName = "debug";
  const baselines = useBaselines();
  const traits = useTraits();
  const baselineComponents = useBaselineComponents();
  const traitsComponents = useTraitsComponents();
  const allegianceComponents = useAllegianceComponents();
  const { renderEvent } = useMemo(
    () =>
      renderer[rendererName]({
        baselines,
        traits,
        baselineComponents,
        traitsComponents,
        allegianceComponents,
      }),
    [rendererName]
  );
  const playerEntity = usePlayerEntity();

  const EventDisplay = useMemo(() => {
    if (playerEntity == null) {
      return () => null;
    }
    return ({ event }: { event: Event }): ReactNode => {
      // TODO Fix peer dependency.
      return useMemo(() => renderEvent(playerEntity, event), [event]) as any;
    };
  }, [renderEvent, playerEntity]);

  // WIP
  const [eventSet, _setEventSet] = useState(new Set<Event>());
  // useEffect(() => {
  //   setEventSet((events) => {
  //     if (
  //       controllerEntityToken.value?.observer == null ||
  //       controllerEntityToken.value.observer.length < 1
  //     ) {
  //       return events;
  //     }
  //     return new Set([...events, ...controllerEntityToken.value.observer]);
  //   });
  // }, [controllerEntityToken]);

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
