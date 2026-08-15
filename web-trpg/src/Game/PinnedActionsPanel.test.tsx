import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { actionIdOf, mockTable } from "../testSupport/mockConnection";
import { gameWrapper } from "../testSupport/gameWrapper";
import { PinnedActionsPanel } from "./PinnedActionsPanel";

// The bar: slot 0 is ACTIVATE (the focus's custom offer; disabled with
// nothing to fire), then CONFIGURED slots that hold position and hotkey
// even while invalid — visibly disabled, never hidden.
test("Activate leads the bar; configured slots hold their keys while invalid", () => {
  const bopId = actionIdOf("bop");
  const wrapper = gameWrapper(
    {
      player_controller_components: mockTable([
        { entityId: 1n, accountId: 1n },
      ]),
      pinned_actions_components: mockTable([
        { entityId: 1n, actionIds: [bopId] },
      ]),
    },
    { identity: {} as Identity },
  );
  const { container } = render(<PinnedActionsPanel />, { wrapper });
  const buttons = [...container.querySelectorAll("button")];

  // Slot 0: Activate, disabled (no focus, nothing offered), key J.
  expect(buttons[0]!.textContent).toContain("Activate");
  expect(buttons[0]!.hasAttribute("disabled")).toBe(true);
  expect(buttons[0]!.textContent).toContain("J");

  // Slot 1: the configured bop — key K held, visibly disabled (no
  // focus makes it invalid), never hidden.
  expect(buttons[1]!.textContent).toContain("Bop");
  expect(buttons[1]!.textContent).toContain("K");
  expect(buttons[1]!.hasAttribute("disabled")).toBe(true);
});
