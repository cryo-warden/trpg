type Schedule<T, TRestArgs extends any[]> = (t: T, ...args: TRestArgs) => void;

type CreateSchedule = <T, TRestArgs extends any[]>(
  ...fns: ((t: T, ...args: TRestArgs) => T)[]
) => Schedule<T, TRestArgs>;

export const createSchedule: CreateSchedule =
  (...fns) =>
  (start, ...restArgs) => {
    let t = start;
    for (let i = 0; i < fns.length; ++i) {
      t = fns[i](t, ...restArgs);
    }
    return t;
  };
