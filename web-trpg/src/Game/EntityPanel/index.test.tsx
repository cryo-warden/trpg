import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { mockTable } from "../../testSupport/mockConnection";
import { gameWrapper } from "../../testSupport/gameWrapper";
import { EntityPanel } from "./index";

// Player 1 stands in room 10 beside path 4, which leads to room 20.
const tables = (visited: { locationEntityId: bigint }[]) => ({
  player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
  location_components: mockTable([
    { entityId: 1n, locationEntityId: 10n },
    { entityId: 4n, locationEntityId: 10n },
  ]),
  path_components: mockTable([
    { entityId: 4n, destinationEntityId: 20n },
  ]),
  entities_visited_locations: mockTable(
    visited.map((row, index) => ({
      id: BigInt(index + 1),
      visitorEntityId: 1n,
      locationEntityId: row.locationEntityId,
    })),
  ),
});

test("a path to an UNVISITED location wears the interesting badge", () => {
  const { container } = render(<EntityPanel entity={4n} />, {
    wrapper: gameWrapper(tables([]), { identity: {} as Identity }),
  });
  expect(container.querySelector(".EntityPanel")!.className).toContain(
    "interesting",
  );
});

test("a path to a visited location does not", () => {
  const { container } = render(<EntityPanel entity={4n} />, {
    wrapper: gameWrapper(tables([{ locationEntityId: 20n }]), {
      identity: {} as Identity,
    }),
  });
  expect(container.querySelector(".EntityPanel")!.className).not.toContain(
    "interesting",
  );
});

test("re-rendering keeps the action bar's DOM node — no remount, scroll survives", () => {
  // Regression: ActionBar was once defined INSIDE EntityPanel, making it
  // a brand-new component type every render — React tore down and
  // remounted the button strip (resetting its scroll) whenever anything
  // re-rendered the panel, e.g. each incoming event message.
  const wrapper = gameWrapper(tables([]), { identity: {} as Identity });
  const { container, rerender } = render(
    <EntityPanel entity={4n} detailed />,
    { wrapper },
  );
  const before = container.querySelector(".ActionBar");
  expect(before).not.toBeNull();
  rerender(<EntityPanel entity={4n} detailed />);
  expect(container.querySelector(".ActionBar")).toBe(before as Element);
});

test("a guarded path is invisible while its blocker stands, visible once smashed", () => {
  const guarded = (blockerHp: { entityId: bigint; hp: number; mhp: number }[]) => ({
    ...tables([]),
    path_blocker_components: mockTable([
      { entityId: 4n, blockerEntityId: 7n },
    ]),
    hp_components: mockTable(blockerHp),
  });
  const standing = render(<EntityPanel entity={4n} />, {
    wrapper: gameWrapper(guarded([{ entityId: 7n, hp: 1, mhp: 1 }]), {
      identity: {} as Identity,
    }),
  });
  expect(standing.container.querySelector(".EntityPanel")).toBeNull();

  const smashed = render(<EntityPanel entity={4n} />, {
    wrapper: gameWrapper(guarded([]), { identity: {} as Identity }),
  });
  expect(smashed.container.querySelector(".EntityPanel")).not.toBeNull();
});
