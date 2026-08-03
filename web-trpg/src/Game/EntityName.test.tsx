import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { mockTable, stdbWrapper } from "../testSupport/mockConnection";
import { EntityName } from "./EntityName";

test("EntityName renders an entity's appearance-derived name", () => {
  const wrapper = stdbWrapper({
    // Index 0 is the noun "human" in the appearance asset.
    appearance_features_components: mockTable([
      { entityId: 1n, appearanceFeatureIndexes: [0] },
    ]),
  });
  const { container } = render(<EntityName entityId={1n} />, { wrapper });
  expect(container.textContent).toBe("human");
});

test("EntityName falls back to 'something' for an unknown entity", () => {
  const wrapper = stdbWrapper({ appearance_features_components: mockTable([]) });
  const { container } = render(<EntityName entityId={1n} />, { wrapper });
  expect(container.textContent).toBe("something");
});
