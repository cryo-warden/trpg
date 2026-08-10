import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { ACTIONS } from "./assets/actions";
import { actionIdOf, mockTable } from "../testSupport/mockConnection";
import { gameWrapper } from "../testSupport/gameWrapper";
import { ActionButton } from "./ActionButton";

test("ActionButton shows the action name and queues the action on click", () => {
  const identity = {} as Identity;
  const calls: unknown[] = [];
  const bopId = actionIdOf("bop");
  const wrapper = gameWrapper(
    {
      player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
      location_components: mockTable([{ entityId: 1n, locationEntityId: 10n }]),
      action_state_components: mockTable([]),
      queued_action_state_components: mockTable([]),
      action_hotkeys_components: mockTable([]),
    },
    { identity, reducers: { act: (arg: unknown) => calls.push(arg) } },
  );

  const { getByRole } = render(<ActionButton actionId={bopId} target={2n} />, {
    wrapper,
  });
  const button = getByRole("button");
  expect(button.textContent).toContain(ACTIONS.bop.appearance.displayName);

  button.click();
  expect(calls).toEqual([{ actionId: bopId, targetEntityId: 2n }]);
});
