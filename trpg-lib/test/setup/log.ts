import { createLogger } from "bitecs-helpers";

export const { log } = createLogger({ onLog: console.log });

const LOG_LEVEL = Number.parseInt(Bun.env.LOG_LEVEL || "1", 10);

export const debugLogger = createLogger({
  prefix: "DEBUG",
  onLog: LOG_LEVEL > 0 ? log : undefined,
});

export const verboseLogger = createLogger({
  onLog: LOG_LEVEL > 1 ? log : undefined,
});
