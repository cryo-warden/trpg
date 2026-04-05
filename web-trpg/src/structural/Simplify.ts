export type Simplify<T> = { [K in keyof T]: Simplify<T[K]> } & {};
