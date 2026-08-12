import { test, expect } from "bun:test";
import { act, render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { mockTable } from "../../testSupport/mockConnection";
import { gameWrapper } from "../../testSupport/gameWrapper";
import { EntityPanel } from "./index";

test("EntityPanel shows an entity's name and vitals, and focuses it on click", () => {
  const identity = {} as Identity;
  const wrapper = gameWrapper(
    {
      player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
      location_components: mockTable([
        { entityId: 1n, locationEntityId: 10n },
        { entityId: 2n, locationEntityId: 10n },
      ]),
      appearance_features_components: mockTable([
        { entityId: 2n, appearanceFeatureIndexes: [0] }, // "human"
      ]),
      hp_components: mockTable([{ entityId: 2n, hp: 7, mhp: 10 }]),
      ep_components: mockTable([{ entityId: 2n, ep: 4, mep: 6 }]),
      // Allies: otherwise entity 2 would be a lone hostile and the provider
      // would auto-focus it before the click this test exercises.
      allegiance_components: mockTable([
        { entityId: 1n, allegianceEntityId: 10n },
        { entityId: 2n, allegianceEntityId: 10n },
      ]),
    },
    { identity },
  );

  const { container } = render(<EntityPanel entity={2n} />, { wrapper });
  const panel = container.querySelector(".EntityPanel") as HTMLElement;
  expect(panel.textContent).toContain("human");
  expect(panel.textContent).toContain("7 / 10 HP");
  expect(panel.textContent).toContain("4 / 6 EP");
  expect(panel.className).not.toContain("focused");

  act(() => panel.click());
  expect(panel.className).toContain("focused");
});
