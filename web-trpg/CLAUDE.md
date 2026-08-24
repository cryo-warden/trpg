# Display language is a locale concern — never in assets, never on the wire

This is a fundamental, non-negotiable design rule for the client. It was
violated once (appearance-feature display text lived on an asset and crossed
the wire); it must never be reintroduced.

## The rule

- **Asset `name` fields are lookup KEYS, not display text.** A name identifies a
  role so other assets (and the server) can refer to it. It is an authoring
  identifier — read it as if it were spelled `key`. A key MAY be multiple words
  joined by underscores (`ceramic_shards`, `rock_wall`).
- **Display language never lives in an asset, and never lands on the backend.**
  The server has no use for how a thing reads to a person; if display text is on
  the wire, something is wrong.
- **Rendering is a locale plugin's job.** Each locale (`renderer/en-us/…`,
  `renderer/debug.ts`, …) decides how to turn a role key into words. English is
  just another locale plugin following the same pattern — it gets no special
  right to embed strings in assets.
- **Rendered display must never show a key's underscores as word separators.**
  `ceramic_shards` renders as `ceramic shards`.

## How a locale plugin is structured

- A locale plugin may span multiple files: define one module per asset bundle
  (e.g. `en-us/appearanceFeatures.ts`), each a list of renderable strings for
  every asset in that bundle.
- **Prefer the type system over a test for completeness.** Type a bundle's
  vocabulary as a total `Record<XxxName, string>` over the asset name union, so
  the COMPILER rejects any asset that lacks a rendering. A test is only for
  invariants the type system can't express (e.g. "no rendered string contains an
  underscore").
- Where the compiler can't guarantee it, each locale gets a test that iterates
  every asset in the bundle and asserts it renders.

## Where things flow

- The wire `appearance_features` table carries `index`, `name` (key),
  `appearanceFeatureType`, `priority`, `exclusionGroup` — no display text.
- The client resolves an entity's feature indexes → keys, and a locale
  (`appearanceFeatureDisplayOf`) turns each key into a word. The domain naming
  rules (`Game/domain/appearance.ts`) take an injected `displayOf` and never read
  display text off a feature.
