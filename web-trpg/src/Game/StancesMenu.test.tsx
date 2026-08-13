import { test, expect, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import type { StatBlock } from "../stdb/types";
import {
  actionIdOf,
  armamentIdOf,
  mockTable,
  stanceIdOf,
} from "../testSupport/mockConnection";
import { gameWrapper } from "../testSupport/gameWrapper";
import { StancesMenu } from "./StancesMenu";

const runtimeStatBlock = (partial: Partial<StatBlock>): StatBlock => ({
  attack: 0,
  defense: 0,
  hand: 0,
  gait: 0,
  reach: 0,
  blunt: 0,
  bladed: 0,
  pole: 0,
  ward: 0,
  focus: 0,
  wing: 0,
  size: 0,
  morale: 0,
  mhp: 0,
  mep: 0,
  actionIds: [],
  appearanceFeatureIds: [],
  stanceIds: [],
  ...partial,
});

// The player (entity 1) knows standing, stands in it with empty hands
// (grip 2), and could reach dueling through the duel posture in their
// total's unfiltered action grants. They carry a sword (entity 5, hand -1,
// assigned to dueling) and a spear (entity 8, hand -2, assigned nowhere).
const tables = () => ({
  player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
  total_stat_block_components: mockTable([
    {
      entityId: 1n,
      statBlock: runtimeStatBlock({
        hand: 2,
        actionIds: [actionIdOf("stand"), actionIdOf("duel")],
      }),
    },
  ]),
  known_stances_components: mockTable([
    { entityId: 1n, stanceIds: [stanceIdOf("standing")] },
  ]),
  active_stance_components: mockTable([
    { entityId: 1n, stanceId: stanceIdOf("standing") },
  ]),
  location_components: mockTable([
    { entityId: 5n, locationEntityId: 1n },
    { entityId: 8n, locationEntityId: 1n },
  ]),
  item_components: mockTable([
    { entityId: 5n, itemRef: { tag: "Armament", value: armamentIdOf("sword") } },
    { entityId: 8n, itemRef: { tag: "Armament", value: armamentIdOf("spear") } },
  ]),
  stance_loadouts_components: mockTable([
    {
      entityId: 1n,
      assignments: [
        { stanceId: stanceIdOf("dueling"), armamentIds: [armamentIdOf("sword")] },
      ],
    },
  ]),
});

const cardOf = (container: HTMLElement, stanceName: string) =>
  [...container.querySelectorAll(".stanceCard")].find((card) =>
    card.querySelector("h3")!.textContent!.startsWith(stanceName),
  );

test("shows exactly the REACHABLE stances, marking active and unknown", () => {
  const wrapper = gameWrapper(tables(), { identity: {} as Identity });
  const { container } = render(<StancesMenu />, { wrapper });

  expect(cardOf(container, "standing")?.textContent).toContain("(active)");
  // Dueling is reachable through the duel posture but not yet KNOWN.
  expect(cardOf(container, "dueling")?.textContent).toContain(
    "(not yet known)",
  );
  // No wings anywhere in the seeds: perched stays out of the menu.
  expect(cardOf(container, "perched")).toBeUndefined();
});

test("a card shows the stats and actions the stance would grant", () => {
  const wrapper = gameWrapper(tables(), { identity: {} as Identity });
  const { container } = render(<StancesMenu />, { wrapper });

  const dueling = cardOf(container, "dueling")!;
  expect(dueling.textContent).toContain("Attack +1");
  expect(dueling.textContent).toContain("Grants: lunge");
});

test("assigned armaments highlight and unassign; overweight ones disable", () => {
  const assignStanceArmaments = mock(() => {});
  const wrapper = gameWrapper(tables(), {
    identity: {} as Identity,
    reducers: { assignStanceArmaments },
  });
  const { container } = render(<StancesMenu />, { wrapper });

  const dueling = cardOf(container, "dueling")!;
  const buttons = [...dueling.querySelectorAll("button")];
  const sword = buttons.find((b) => b.textContent === "sword")!;
  const spear = buttons.find((b) => b.textContent === "spear")!;

  expect(sword.className).toContain("active");
  // Grip 2, sword already holds 1: the two-handed spear cannot also fit.
  expect(spear.disabled).toBe(true);

  // Clicking the equipped sword UNassigns it from this stance's loadout.
  fireEvent.click(sword);
  expect(assignStanceArmaments).toHaveBeenCalledWith({
    stanceId: stanceIdOf("dueling"),
    armamentIds: [],
  });
});
