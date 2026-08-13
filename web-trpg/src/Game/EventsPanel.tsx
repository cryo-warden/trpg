import {
  ComponentPropsWithoutRef,
  Fragment,
  ReactNode,
  useCallback,
  useMemo,
  useState,
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

  const eventSet = useTableStream("observable_events", (e) => e, []);

  // Names are BAKED into each message when it is first rendered: an entity
  // later dying, despawning, or being renamed must never corrupt what an
  // earlier message said happened. The map holds each event's one-and-only
  // rendering; renderer changes only affect messages that arrive after.
  const [bakedMap] = useState(() => new Map<EntityEvent, ReactNode>());
  const baked = useMemo(() => {
    if (playerEntity == null) {
      // No viewpoint yet: don't bake (messages would miss "you"); render
      // nothing until the player exists.
      return [];
    }
    return Array.from(eventSet).map((event) => {
      let node = bakedMap.get(event);
      if (node === undefined) {
        node = renderEvent(event);
        bakedMap.set(event, node);
      }
      return node;
    });
  }, [eventSet, renderEvent, playerEntity, bakedMap]);

  const setMode = useSetDynamicPanelMode();
  const clearSelection = useCallback(() => {
    setMode("location");
    setFocus(null);
  }, [setMode, setFocus]);

  const ref = useHotkeyRef<HTMLDivElement>("Escape");

  return (
    <Panel {...props} ref={ref} onClick={clearSelection}>
      <Scroller bottomLock>
        {baked.map((node, i) => (
          <Fragment key={i}>{node}</Fragment>
        ))}
      </Scroller>
    </Panel>
  );
};
