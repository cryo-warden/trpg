import type { System } from "../System";

/** Only helps enforce System typing. */
export const createSystem = (system: System): System => system;
