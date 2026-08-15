import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { ACTION_APPEARANCES } from "./assets/actions";
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
      action_queue_components: mockTable([]),
      action_hotkeys_components: mockTable([]),
      // The button disables when the action is invalid against the
      // focus, so the fixture makes bop VALID: known, hostile target
      // with hp.
      actions_components: mockTable([{ entityId: 1n, actionIds: [bopId] }]),
      hp_components: mockTable([{ entityId: 2n, hp: 5, mhp: 5 }]),
      allegiance_components: mockTable([
        { entityId: 1n, allegianceEntityId: 10n },
        { entityId: 2n, allegianceEntityId: 20n },
      ]),
    },
    { identity, reducers: { act: (arg: unknown) => calls.push(arg) } },
  );

  const { getByRole } = render(<ActionButton actionId={bopId} target={2n} />, {
    wrapper,
  });
  const button = getByRole("button");
  expect(button.textContent).toContain(ACTION_APPEARANCES.bop.displayName);

  button.click();
  expect(calls).toEqual([{ actionId: bopId, targetEntityId: 2n }]);
});
