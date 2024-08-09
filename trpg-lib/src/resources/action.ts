export type ActionEffect = () => void;

export type ActionPhase =
  | {
      type: "delay";
      delaySeconds: number;
    }
  | {
      type: "effect";
      effect: ActionEffect | null;
    };

export type Action = {
  key: string;
  phases: ActionPhase[];
};

export const actions = [
  {
    key: "NULL_ACTION",
    phases: [],
  },
  {
    key: "go",
    phases: [
      { type: "delay", delaySeconds: 1 },
      {
        type: "effect",
        effect: (...args) => {
          // WIP effect cannot be a function. Make it a string, and think about the possibility of making each effect a different component and/or system.
          console.log(...args);
        },
      },
      { type: "delay", delaySeconds: 1 },
    ],
  },
] as const satisfies Action[];

type ParseInt<T> = T extends `${infer N extends number}` ? N : never;

type TupleKeys<T extends [...any[]]> = ParseInt<keyof Omit<T, keyof []>>;

export const actionKeyIndexRecord: {
  [index in TupleKeys<typeof actions> as (typeof actions)[index]["key"]]: index;
} = Object.fromEntries(actions.map(({ key }, index) => [key, index])) as any;

export const { NULL_ACTION } = actionKeyIndexRecord;
