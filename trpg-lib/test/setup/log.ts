import { createLogger } from "bitecs-helpers";

export const debugLogger = createLogger({ prefix: "DEBUG", level: 1 });

export const verboseLogger = createLogger({ level: 2 });
