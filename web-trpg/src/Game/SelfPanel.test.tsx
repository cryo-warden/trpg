import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { actions } from "./assets";
import { mockTable } from "../testSupport/mockConnection";
import { gameWrapper } from "../testSupport/gameWrapper";
import { SelfPanel } from "./SelfPanel";

test("SelfPanel renders the player's detailed panel with self-valid action buttons", () => {
  const identity = {} as Identity;
  const buffId = actions.findIndex((a) => a.type === "Buff");
  const wrapper = gameWrapper(
    {
      player_controller_components: mockTable([{ entityId: 1n, identity }]),
      location_components: mockTable([{ entityId: 1n, locationEntityId: 10n }]),
      appearance_features_components: mockTable([
        { entityId: 1n, appearanceFeatureIndexes: [0] },
      ]),
      hp_components: mockTable([{ entityId: 1n, hp: 5, mhp: 5 }]),
      ep_components: mockTable([{ entityId: 1n, ep: 5, mep: 5 }]),
      allegiance_components: mockTable([]),
      actions_components: mockTable([{ entityId: 1n, actionIds: [buffId] }]),
      action_state_components: mockTable([]),
      queued_action_state_components: mockTable([]),
      action_hotkeys_components: mockTable([]),
      path_components: mockTable([]),
    },
    { identity },
  );

  const { container } = render(<SelfPanel />, { wrapper });
  expect(container.querySelector(".EntityPanel")).not.toBeNull();
  expect(container.textContent).toContain("human");
  // detailed -> ActionBar shows the self-valid buff action
  expect(container.querySelector(".ActionBar .ActionButton")).not.toBeNull();
});

test("SelfPanel renders nothing when there is no player", () => {
  const wrapper = gameWrapper({
    player_controller_components: mockTable([]),
    location_components: mockTable([]),
  });
  const { container } = render(<SelfPanel />, { wrapper });
  expect(container.textContent).toBe("");
});
