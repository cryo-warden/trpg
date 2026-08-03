import { test, expect } from "bun:test";
import { act, render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import type { EntityEvent } from "../stdb/types";
import { mockTable } from "../testSupport/mockConnection";
import { gameWrapper } from "../testSupport/gameWrapper";
import { EventsPanel } from "./EventsPanel";

const attackEvent = (
  owner: bigint,
  target: bigint,
  value: number,
): EntityEvent =>
  ({
    ownerEntityId: owner,
    targetEntityId: target,
    eventType: { tag: "ActionEffect", value: { tag: "Attack", value } },
  }) as unknown as EntityEvent;

test("EventsPanel narrates observable events as they arrive", () => {
  const identity = {} as Identity;
  const observableEvents = mockTable<EntityEvent>([]);
  const wrapper = gameWrapper(
    {
      player_controller_components: mockTable([{ entityId: 1n, identity }]),
      location_components: mockTable([{ entityId: 1n, locationEntityId: 10n }]),
      appearance_features_components: mockTable([
        { entityId: 2n, appearanceFeatureIndexes: [3] }, // "path"
        { entityId: 3n, appearanceFeatureIndexes: [0] }, // "human"
      ]),
      allegiance_components: mockTable([]),
      observable_events: observableEvents,
    },
    { identity },
  );

  const { container } = render(<EventsPanel />, { wrapper });
  expect(container.textContent).not.toContain("dealt");

  act(() => observableEvents.insertRow(attackEvent(2n, 3n, 3)));
  expect(container.textContent).toContain("dealt 3 damage to");
});
