import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { mockTable } from "../../../testSupport/mockConnection";
import { gameWrapper } from "../../../testSupport/gameWrapper";
import { EntitiesDisplay } from "./index";

test("EntitiesDisplay renders an EntityPanel per entity id", () => {
  const identity = {} as Identity;
  const wrapper = gameWrapper(
    {
      player_controller_components: mockTable([{ entityId: 1n, identity }]),
      location_components: mockTable([{ entityId: 1n, locationEntityId: 10n }]),
      appearance_features_components: mockTable([
        { entityId: 2n, appearanceFeatureIndexes: [0] },
      ]),
      hp_components: mockTable([{ entityId: 2n, hp: 3, mhp: 3 }]),
      ep_components: mockTable([{ entityId: 2n, ep: 1, mep: 1 }]),
      allegiance_components: mockTable([]),
    },
    { identity },
  );

  const { container } = render(<EntitiesDisplay entityIds={[2n]} />, { wrapper });
  expect(container.querySelectorAll(".EntityPanel").length).toBe(1);
  expect(container.textContent).toContain("human");
});
