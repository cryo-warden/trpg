import { test, expect } from "bun:test";
import { APPEARANCE_FEATURES } from "../../Game/assets/appearance_features";
import { appearanceFeatureDisplayOf } from "./appearanceFeatures";

// Completeness (every feature has a rendering) is enforced by the compiler:
// APPEARANCE_FEATURE_DISPLAY is a total Record<AppearanceFeatureName, string>.
// This test guards the one rule the type system can't express — every asset
// renders, and a rendered word never leaks an underscore-joined lookup key.
test("every appearance feature renders to non-empty, underscore-free en-US text", () => {
  for (const name of Object.keys(
    APPEARANCE_FEATURES,
  ) as (keyof typeof APPEARANCE_FEATURES)[]) {
    const rendered = appearanceFeatureDisplayOf(name);
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered).not.toContain("_");
  }
});
