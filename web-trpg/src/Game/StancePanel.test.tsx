import { test, expect, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { mockTable, stanceIdOf } from "../testSupport/mockConnection";
import { gameWrapper } from "../testSupport/gameWrapper";
import { StancePanel } from "./StancePanel";

import { STANCES } from "./assets/stances";

const worldTables = () => ({
  player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
  active_stance_components: mockTable([
    { entityId: 1n, stanceId: stanceIdOf("brawler") },
  ]),
});

test("StancePanel lists every stance and highlights the active one", () => {
  const wrapper = gameWrapper(worldTables(), { identity: {} as Identity });

  const { container } = render(<StancePanel />, { wrapper });
  const buttons = [...container.querySelectorAll(".StanceButton")];
  expect(buttons.map((button) => button.textContent)).toEqual(
    Object.keys(STANCES),
  );
  expect(
    container.querySelector(".StanceButton.active")?.textContent,
  ).toBe("brawler");
});

test("clicking a stance calls the setStance reducer with that stance's id", () => {
  const setStance = mock(() => {});
  const wrapper = gameWrapper(worldTables(), {
    identity: {} as Identity,
    reducers: { setStance },
  });

  const { container } = render(<StancePanel />, { wrapper });
  const prone = [...container.querySelectorAll(".StanceButton")].find(
    (button) => button.textContent === "prone",
  )!;
  fireEvent.click(prone);
  expect(setStance).toHaveBeenCalledWith({ stanceId: stanceIdOf("prone") });
});
