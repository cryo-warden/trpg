# `bitecs-lib`

A library to provide convenient extra features on top of `bitecs`.

Things `bitecs` can't do:

- Non-number properties in components.
  - Working around this requires a lot of boilerplate and may incur high performance costs. This library attempts to minimize the boilerplate and performance costs.

## Setup

```bash
bun install

bun test

# build the app, available under `dist`
bun run build
```
