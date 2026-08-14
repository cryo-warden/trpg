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
  upright: 0,
  size: 0,
  morale: 0,
  mhp: 0,
  mep: 0,
  actionIds: [],
  appearanceFeatureIds: [],
  ...partial,
});

// The player (entity 1) stands with empty hands (grip 2); standing and
// dueling are REACHABLE through the stand and duel postures in their
// total's action grants. They carry a sword (entity 5, hand -1, assigned
// to dueling) and a spear (entity 8, hand -2, assigned nowhere).
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
        {
          stanceId: stanceIdOf("dueling"),
          armamentIds: [armamentIdOf("sword")],
          actionIds: [],
        },
      ],
    },
  ]),
});

const cardOf = (container: HTMLElement, stanceName: string) =>
  [...container.querySelectorAll(".stanceCard")].find((card) =>
    card.querySelector("h3")!.textContent!.startsWith(stanceName),
  );

test("shows exactly the REACHABLE stances, marking the active one", () => {
  const wrapper = gameWrapper(tables(), { identity: {} as Identity });
  const { container } = render(<StancesMenu />, { wrapper });

  expect(cardOf(container, "standing")?.textContent).toContain("(active)");
  // Dueling is reachable through the duel posture — no "known" state
  // exists; reachability alone decides.
  expect(cardOf(container, "dueling")).toBeDefined();
  // No action anywhere in the seeds adopts perched: out of the menu.
  expect(cardOf(container, "perched")).toBeUndefined();
});

test("gallery dots: one per reachable stance, the active stance marked", () => {
  const wrapper = gameWrapper(tables(), { identity: {} as Identity });
  const { container } = render(<StancesMenu />, { wrapper });

  const dots = [...container.querySelectorAll(".dots button")];
  expect(dots.length).toBe(container.querySelectorAll(".stanceCard").length);
  const standingDot = dots.find(
    (dot) => dot.getAttribute("aria-label") === "standing",
  )!;
  expect(standingDot.className).toContain("activeStance");
});

test("cards show categorized totals with deltas from the no-stance base", () => {
  const wrapper = gameWrapper(tables(), { identity: {} as Identity });
  const { container } = render(<StancesMenu />, { wrapper });

  // Dueling with the assigned sword: base attack 0 + stance 1, base hand 2
  // + sword -1, and the sword's own morale ride along — each with its
  // parenthesized delta against the no-stance value.
  const dueling = cardOf(container, "dueling")!;
  expect(dueling.textContent).toContain("Attack 1 (+1)");
  expect(dueling.textContent).toContain("Hand 1 (-1)");
  expect(dueling.textContent).toContain("Morale 1 (+1)");
  expect(dueling.textContent).toContain("Grants: lunge");
  // The category headings structure the list.
  expect(dueling.textContent).toContain("Combat");
  expect(dueling.textContent).toContain("Body");

  // Standing assigns nothing: bare-body totals, zero deltas.
  const standing = cardOf(container, "standing")!;
  expect(standing.textContent).toContain("Hand 2 (0)");
  expect(standing.textContent).toContain("Attack 0 (0)");
});

test("the bar lists assigned actions in hotkey order; a tap removes", () => {
  const assignStanceActions = mock(() => {});
  const withBar = {
    ...tables(),
    stance_loadouts_components: mockTable([
      {
        entityId: 1n,
        assignments: [
          {
            stanceId: stanceIdOf("dueling"),
            armamentIds: [armamentIdOf("sword")],
            actionIds: [actionIdOf("duel"), actionIdOf("stand")],
          },
        ],
      },
    ]),
  };
  const wrapper = gameWrapper(withBar, {
    identity: {} as Identity,
    reducers: { assignStanceActions },
  });
  const { container } = render(<StancesMenu />, { wrapper });

  const dueling = cardOf(container, "dueling")!;
  const chips = [...dueling.querySelectorAll(".actionBar .actionChip")];
  expect(chips.map((chip) => chip.textContent)).toEqual([
    "1 duel",
    "2 stand",
  ]);
  // Assigned actions live in the bar, not the pool.
  const poolLabels = [...dueling.querySelectorAll("button")]
    .filter((button) => !button.className.includes("actionChip"))
    .map((button) => button.textContent);
  expect(poolLabels).not.toContain("duel");

  // A plain tap removes, preserving the rest of the order.
  fireEvent.click(chips[0]);
  expect(assignStanceActions).toHaveBeenCalledWith({
    stanceId: stanceIdOf("dueling"),
    actionIds: [actionIdOf("stand")],
  });
});

test("assigning an action pins it into the stance's bar order", () => {
  const assignStanceActions = mock(() => {});
  const wrapper = gameWrapper(tables(), {
    identity: {} as Identity,
    reducers: { assignStanceActions },
  });
  const { container } = render(<StancesMenu />, { wrapper });

  // Dueling's candidate pool includes its own grant, lunge.
  const dueling = cardOf(container, "dueling")!;
  const lunge = [...dueling.querySelectorAll("button")].find((button) =>
    button.textContent!.includes("lunge"),
  )!;
  fireEvent.click(lunge);
  expect(assignStanceActions).toHaveBeenCalledWith({
    stanceId: stanceIdOf("dueling"),
    actionIds: [actionIdOf("lunge")],
  });
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
