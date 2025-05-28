import "./index.css";

import {
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
import { useSetDynamicPanelMode } from "./context/DynamicPanelContext";
import { useTarget } from "./context/TargetContext";
import { EntityEvent } from "./trpg";
import { renderer } from "../renderer";
import { usePlayerEntity } from "./context/StdbContext";

export const EventsPanel = (props: ComponentPropsWithoutRef<typeof Panel>) => {
  const rendererName = "debug";
  const { renderEvent } = useMemo(
    () => renderer[rendererName](),
    [rendererName]
  );
  const playerEntity = usePlayerEntity();

  const EventDisplay = useMemo(() => {
    if (playerEntity == null) {
      return () => null;
    }
    return ({ event }: { event: EntityEvent }): ReactNode => {
      // TODO Fix peer dependency.
      return useMemo(() => renderEvent(playerEntity, event), [event]) as any;
    };
  }, [renderEvent, playerEntity]);

  // WIP
  const [eventSet, _setEventSet] = useState(new Set<EntityEvent>());
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
  const { setTarget } = useTarget();
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
