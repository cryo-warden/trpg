import type { System } from "../System";

/** Does nothing, but helps enforce System typing. */

export const createSystem = (system: System): System => system;
