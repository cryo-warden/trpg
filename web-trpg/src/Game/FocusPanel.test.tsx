import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { mockTable } from "../testSupport/mockConnection";
import { gameWrapper } from "../testSupport/gameWrapper";
import { FocusPanel } from "./FocusPanel";

const identity = {} as Identity;
const tables = () => ({
  player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
  location_components: mockTable([
    { entityId: 1n, locationEntityId: 10n },
    { entityId: 2n, locationEntityId: 10n },
  ]),
  appearance_features_components: mockTable([
    { entityId: 2n, appearanceFeatureIndexes: [0] },
  ]),
  hp_components: mockTable([{ entityId: 2n, hp: 3, mhp: 3 }]),
  ep_components: mockTable([{ entityId: 2n, ep: 1, mep: 1 }]),
  allegiance_components: mockTable([]),
  actions_components: mockTable([{ entityId: 1n, actionIds: [] }]),
  action_state_components: mockTable([]),
  queued_action_state_components: mockTable([]),
  action_hotkeys_components: mockTable([]),
  path_components: mockTable([]),
});

test("FocusPanel shows an empty panel when nothing is focused", () => {
  const { container } = render(<FocusPanel />, {
    wrapper: gameWrapper(tables(), { identity, focus: null }),
  });
  expect(container.querySelector(".Panel")).not.toBeNull();
  expect(container.querySelector(".EntityPanel")).toBeNull();
});

test("FocusPanel shows the focused entity's detailed panel", () => {
  const { container } = render(<FocusPanel />, {
    wrapper: gameWrapper(tables(), { identity, focus: 2n }),
  });
  expect(container.querySelector(".EntityPanel")).not.toBeNull();
  expect(container.textContent).toContain("human");
});

test("FocusPanel shows the self-selection panel when focusing the player", () => {
  const { getByText } = render(<FocusPanel />, {
    wrapper: gameWrapper(tables(), { identity, focus: 1n }),
  });
  expect(getByText("Room")).not.toBeNull();
  expect(getByText("Stats")).not.toBeNull();
});
