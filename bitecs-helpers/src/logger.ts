type LoggerOptions = {
  onLog?: (...args: any[]) => void;
};

type Logger = {
  logs: any[][];
  reset: () => void;
  log: (...args: any[]) => void;
};

type CreateLogger = (options?: LoggerOptions) => Logger;

export const createLogger: CreateLogger = ({ onLog } = {}) => {
  const logs: any[][] = [];

  return {
    logs,
    reset: () => {
      logs.length = 0;
    },
    log: (...args) => {
      logs.push(args);
      if (onLog) {
        onLog(...args);
      }
    },
  };
};
