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
import { renderer } from "../renderer";
import {
  useAllegianceComponents,
  useAppearanceFeatures,
  useAppearanceFeaturesComponents,
  useObserverComponentsEvents,
  usePlayerEntity,
  useStdbConnection,
} from "./context/StdbContext";
import { EntityEvent } from "../stdb";

export const EventsPanel = (props: ComponentPropsWithoutRef<typeof Panel>) => {
  const connection = useStdbConnection();
  const rendererName = "debug";
  const appearanceFeatures = useAppearanceFeatures();
  const appearanceFeaturesComponents = useAppearanceFeaturesComponents();
  const allegianceComponents = useAllegianceComponents();
  const { renderEvent } = useMemo(
    () =>
      renderer[rendererName]({
        appearanceFeatures,
        appearanceFeaturesComponents,
        allegianceComponents,
      }),
    [
      rendererName,
      appearanceFeatures,
      appearanceFeaturesComponents,
      allegianceComponents,
    ]
  );
  const playerEntity = usePlayerEntity();

  const EventDisplay = useMemo(() => {
    if (playerEntity == null) {
      return () => null;
    }
    return ({ event }: { event: EntityEvent }): ReactNode => {
      return useMemo(() => renderEvent(playerEntity, event), [event]);
    };
  }, [renderEvent, playerEntity]);

  const [eventSet, setEventSet] = useState(new Set<EntityEvent>());

  const events = useObserverComponentsEvents(playerEntity);

  useEffect(() => {
    setEventSet((oldEvents) => {
      if (events.length < 1) {
        return oldEvents;
      }
      return new Set([...oldEvents, ...events]);
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
