type LoggerOptions = {
  prefix?: string;
  onLog?: (...args: any[]) => void;
};

type Logger = {
  logs: any[][];
  reset: () => void;
  log: (...args: any[]) => void;
};

type CreateLogger = (options?: LoggerOptions) => Logger;

export const createLogger: CreateLogger = ({ prefix, onLog } = {}) => {
  const logs: any[][] = [];

  return {
    logs,
    reset: () => {
      logs.length = 0;
    },
    log: (...args) => {
      logs.push(args);
      if (onLog) {
        if (prefix) {
          onLog(prefix + ":", ...args);
        } else {
          onLog(...args);
        }
      }
    },
  };
};
