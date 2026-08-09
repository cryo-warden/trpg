import { test, expect } from "bun:test";
import { render, renderHook } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import type { EntityEvent } from "../stdb/types";
import { mockTable, stdbWrapper } from "../testSupport/mockConnection";
import { useLanguageRenderer } from "./useLanguageRenderer";
import { createEnUs } from "./en-us";

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

test("useLanguageRenderer renders an event to React nodes for the player's viewpoint", () => {
  const identity = {} as Identity;
  const wrapper = stdbWrapper(
    {
      player_controller_components: mockTable([{ entityId: 99n, identity }]),
      appearance_features_components: mockTable([
        { entityId: 1n, appearanceFeatureIndexes: [0] }, // noun "human"
        { entityId: 2n, appearanceFeatureIndexes: [3] }, // noun "path"
      ]),
      allegiance_components: mockTable([]),
    },
    identity,
  );

  const { renderEvent } = renderHook(() => useLanguageRenderer(createEnUs), {
    wrapper,
  }).result.current;

  const { container } = render(<>{renderEvent(attackEvent(1n, 2n, 3))}</>);
  expect(container.textContent).toContain("dealt 3 damage to");
});
