type Level = 0 | 1 | 2;

type LoggerOptions<TLevel extends Level, TPrefix extends string> = {
  prefix?: TPrefix;
  level?: TLevel;
  onLog?: (...args: any[]) => void;
};

type Logger<TLevel extends Level, TPrefix extends string> = {
  log: (...args: any[]) => Logger<TLevel, TPrefix>;
};

const LOG_LEVEL = Number.parseInt(Bun.env.LOG_LEVEL ?? "0", 10);
const LOG_PREFIX = (Bun.env.LOG_PREFIX ?? "")
  .split(/ *, */g)
  .filter((s) => s !== "");

export const createLogger = <
  const TLevel extends Level = 2,
  const TPrefix extends string = ""
>({
  prefix,
  level,
  onLog,
}: LoggerOptions<TLevel, TPrefix>): Logger<TLevel, TPrefix> => {
  const enabled =
    (level ?? 2) <= LOG_LEVEL || (prefix && LOG_PREFIX.includes(prefix));

  const logger: Logger<TLevel, TPrefix> = {
    log: (...args) => {
      if (onLog) {
        onLog(args);
      }

      if (enabled) {
        if (prefix) {
          console.log(prefix + ":", ...args);
        } else {
          console.log(...args);
        }
      }

      return logger;
    },
  };

  return logger;
};
