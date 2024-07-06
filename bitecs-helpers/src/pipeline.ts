type Pipeline<T, TArgs extends any[]> = (value: T, ...args: TArgs) => T;

type PipelineReturn<TPipelines> = TPipelines extends Pipeline<infer T, any[]>[]
  ? T
  : never;

// Must Exclude pipelines with empty rest parameters. Otherwise, they will
// fail to match the condition, for some reason.
type RestParameters<TPipelines extends any[]> = Exclude<
  TPipelines[number],
  Pipeline<any, []>
> extends Pipeline<any, infer TRestParameters>
  ? TRestParameters
  : never;

type CreatePipeline = <TPipelines extends Pipeline<any, any[]>[]>(
  ...fns: TPipelines
) => Pipeline<PipelineReturn<TPipelines>, RestParameters<TPipelines>>;

export const createPipeline: CreatePipeline =
  (...pipelines) =>
  (initialValue, ...restArgs) => {
    let value = initialValue;
    for (let i = 0; i < pipelines.length; ++i) {
      value = pipelines[i](value, ...restArgs);
    }
    return value;
  };
