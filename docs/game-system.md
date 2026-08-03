# TRPG Game System — Design Concepts (historical, non-authoritative)

> **This document is NOT authoritative.** It is a historical reflection of the
> retired `action-trpg-lib` reference code, preserved only so its design intent
> is not lost. It is not a specification and does not govern the live game. The
> authoritative implementation is the Rust SpacetimeDB module under `server/`,
> which may already diverge from what is described here — where they disagree,
> the server wins. Treat this as background design notes, not a contract.

This document captures the game-design concepts of the TRPG combat/exploration
system: entities, stats, actions, effects, status effects, the damage model,
maps, and the ordered per-tick rules pipeline.

**Provenance.** These concepts were extracted from `action-trpg-lib`, an
ECS (miniplex-based) TypeScript reference implementation that has been
superannuated and removed. It describes what that retired code did — the
intended game rules as the reference expressed them, not any current source of
truth. A few places note intents the TS reference never finished; those are
called out as TODOs in the final section.

---

## 1. Architecture: an ECS plus a content pack

The system separates two things:

- **Live simulation state** — an `Engine` holding a `world` of entities. An
  entity is a plain object of *optional components*; the presence or absence of
  a field is what defines what the entity is and can do (classic ECS: a thing
  *is* the set of components it currently has). There are no "monster" or
  "sword" classes. Systems select entities by which components they carry
  (e.g. "every entity with `hp` but without `dead`").
- **Static content** — a `Resource` catalog: named-record maps for actions,
  baselines, traits, map themes, and prefab entities. Entities reference content
  *by name* (string keys), which keeps entities serializable and content a
  swappable data pack.

## 2. The Engine and how it ticks

The `Engine` holds:

- `world` — the entity store.
- `time`, `deltaTime` — wall-clock milliseconds. Advancing the clock sets
  `time = now` and `deltaTime = now − previous`. (Wall-clock timing is *not*
  itself deterministic; determinism is carried per-entity via `seed` — see §13.)
- `resource` — the immutable content catalog.
- `events` — a queue of entity events accumulated during a tick.

A **tick** is: advance the clock, then run the root system once. The caller
drives ticks; there is no built-in real-time loop. The root pipeline has two
bands:

- an **outer band** that runs every tick (observer reset, control), and
- an **inner "actor" band** wrapped in a *periodic* system that only fires on
  fixed `actorPeriodMS` boundaries. The periodic wrapper does catch-up: if a lot
  of wall time passed it runs the inner band several times; if little passed,
  zero times. The actor band is where status ticking, action execution,
  movement, and map generation happen.

A **system** is a curried factory `(engine) => () => void`: the outer call binds
once to the engine (typically caching a live query); the inner function is the
per-tick work. Systems compose by `joinSystems` (run children in array order,
synchronously — order is load-bearing) and `periodicSystem` (the time-boundary
wrapper above).

## 3. Entities and components

Every entity field except `name` is optional. The components group into
clusters:

- **Identity:** `name` (the only required field).
- **Vitals:** `hp`/`mhp` (hit points / max), `ep`/`mep` (effort points / max —
  the resource spent to act), `cdp` (critical damage points — durable injury).
- **Combat:** `attack` (added to outgoing damage), `defense` (subtracted from
  incoming damage), `criticalDefense` (subtracted from incoming critical
  damage), `criticalDamageThreshold` (divisor converting a big single-round hit
  into critical damage; defaults to 2 when absent).
- **Per-round accumulators** (transient scratch, pooled then flushed):
  `accumulatedDamage`, `accumulatedCriticalDamage`, `accumulatedHealing`.
- **Actions & control:** `actions` (names of performable actions — *derived*
  from stats, see §4), `actionState` (the action in progress, see §6), and up to
  three controllers (`playerController`, `sequenceController`,
  `awarenessController`) deciding what to do (see §7). `allegiance` references
  another entity denoting "same side" and gates friend/foe targeting.
- **Events:** `observable` (this entity's outgoing event log for the tick),
  `observer` (its incoming inbox).
- **Location & containment:** `location` (the entity this one is inside — rooms
  and inventories are just entities), `contents` (reverse index of occupants,
  guarded by `contentsCleanFlag`), `path: { destination }` (a traversable link;
  `move` targets a path), `locationMapName` (which map the entity is in).
- **Map generation** (an entity can be a map generator): `mapThemeName`,
  `mapLayout` (`"path" | "hub"`), `mapMainPathRoomCount`, `mapTotalRoomCount`,
  `mapLoopCount`, `mapMin/MaxDecorationCount`, `entrypointMapName`,
  `entrypointHubIndex`, and `mapRealizedRoomEntities` (the rooms once realized).
- **Stat derivation:** `baseline`, `traits`, `equipment`, plus per-layer caches
  (`traitsStatBlock`, `equipmentStatBlock`, `statusStatBlock`) and clean flags
  (`*CleanFlag`, `statsCleanFlag`) — see §4.
- **Status effects:** `poison`, `regeneration`, `advantage`, `guard`, `fortify`
  (see §8), plus `unconscious`/`dead` flags.
- **Items:** `takeable`, `equippable` (an `Equippable`), `seed` (per-entity seed
  for deterministic pseudo-randomness — room decorations and randomly-assigned
  special components; deliberately *not* used for loot).

**Clone/merge invariants.** `cloneEntity` rebuilds an entity field-by-field:
entity-reference fields (`location`, `allegiance`) are copied *by reference*
(they are pointers into the shared world graph and must stay identity-stable);
set components (`observer`) are rebuilt as a fresh `Set`; everything else is
shallow-cloned. `mergeEntity(a, b)` clones `a` then overlays `b`'s fields under
the same rules — the primitive for "instantiate a base and override fields."

## 4. Stats and derivation

A **StatBlock** is the unit of stat contribution: `{ mhp, mep, attack, defense,
actionSet }`, where `actionSet` is the set of actions the block grants. Rules:

- `createStatBlock(partial)` zero-fills the numbers and copies `actionSet` into a
  fresh set — blocks are additively composable.
- `mergeStatBlock(target, source)` **adds** the four numbers and **unions** the
  action sets. This is how the layers stack.
- Stats are derived in **layers**, each cached behind a clean flag so a layer
  only recomputes when dirtied:
  1. **baseline** — the base creature template.
  2. **traits** — summed trait stat blocks (`traitsStatBlock`).
  3. **equipment** — summed `equippable.statBlock` of equipped items
     (`equipmentStatBlock`).
  4. **status** — projection of active status effects into a block
     (`statusStatBlock`): `advantage.attack → attack`, `guard.defense → defense`,
     `fortify.mhp → mhp`.
  The apply step merges baseline + traits + equipment + status (in that order)
  and commits the result onto the entity.
- **Applying a block** writes `mhp`, `mep`, `attack`, `defense`, and materializes
  `actionSet` into the `actions` array — *this is how an entity's available
  actions are derived*. Current `hp`/`ep` are **preserved by delta** across max
  changes: if alive, gaining max HP grants that much current HP and losing it
  removes it (a buff to max HP is not a full heal). `criticalDefense` and
  `criticalDamageThreshold` are entity-intrinsic, not part of StatBlock.

Changing equipment/status/traits clears that layer's flag → the layer
recomputes and clears `statsCleanFlag` → the apply step re-merges. Steady-state
ticks skip all of it.

## 5. Content (Resources)

The content catalog holds five name-keyed record maps. **Invariant: `name` is the
primary key** within each record (records are built by `record[item.name] =
item`), so names are unique. Cross-references between records (a baseline citing
action names, a theme citing prefab names) are validated by name.

- **Action** — `{ name, effectSequence, renderer }`. An action is a *named,
  ordered sequence of effects* played out one effect per actor-tick.
  `renderer` is either `null` (non-attack) or an `AttackRenderer` describing
  presentation along three axes: `weightType` (heavy/neutral/light),
  `speedType` (slow/neutral/fast), `armamentType`
  (blade/sword/club/staff/fist/claw/teeth/stick/spout).
- **Effect** — a discriminated union on `type`, each carrying an `Intensity`
  (`normal`/`powerful`/`extreme`, the tempo/commitment qualifier):
  - `rest` — a timing beat (no state change; a common action "wind-up").
  - `attack` — `{ intensity, damage, criticalDamage, statusEffectMap? }`.
  - `buff` — `{ intensity, buff }` where a buff is `{ type:"heal", heal }` or
    `{ type:"status", statusEffectMap }`.
  - `move`, `take`, `drop`, `equip`, `unequip`.
  Constructor helpers exist for each (`normalAttack(damage, crit)`,
  `buffEffect.normalHeal(n)`, etc.).
- **Baseline** — `{ name, statBlock }`: the base creature template (starting
  max HP/EP, attack, defense, innate action set). An entity has one.
- **Trait** — `{ name, statBlock }`: a *modifier* layered on top of a baseline.
  Kept deliberately separate from Baseline. Traits can be purely numeric
  (`soft: defense −2`, `hero: mhp+5, mep+5`) or grant capabilities by adding to
  `actionSet` (`mobile → move`, `collecting → take/drop`, `equipping →
  equip/unequip`). "Being able to move" is thus a composable trait, not a
  hard-coded property.
- **MapTheme** — `{ name, decorationPrefabNames }`: a palette of decoration
  prefabs for procedural rooms.
- **PrefabEntity** — a full `Entity` template stored by name and stamped out
  when the world needs a concrete instance (e.g. decoration objects).

**Action validation / targeting.** `validateEffect(effect, actor, target)`
first requires the target be co-located (same `location`, or the target *is* the
actor's location — acting on the room). Then per effect type:

- **attack:** target has `hp`, target ≠ self, target is not an ally
  (different/absent `allegiance`).
- **buff:** target has `hp`, and is self or an ally.
- **take:** target `takeable`, not already held.
- **drop:** target `takeable`, held, not equipped.
- **equip:** target `equippable`, held, not already equipped.
- **unequip:** target `equippable`, currently equipped.
- **move:** target has a `path`.
- **rest:** always valid.

An action validates against a target only if **every** effect in its sequence
validates. `recommendActions` filters an entity's actions to those fully valid
against a target (a UI helper).

## 6. Actions, effects, and events

An entity acts by acquiring an **ActionState**: `{ action, effectSequenceIndex:
0, targets }`. Only entities *without* an `actionState` and without
`unconscious`/`dead` can be assigned a new one — you finish your current action
before starting another.

Execution walks the effect sequence one effect per actor-tick:

- **begin** — on the first frame (`index === 0`) emits an `action` event
  (a pure notification for observation/animation).
- **per-type effect systems** (attack, buff, move, take, drop, equip, unequip) —
  each looks at the effect at the current index; if the type matches, it iterates
  **all** targets, *re-validates* per target (state may have changed since the
  action was chosen), and translates the effect into an **event** (it does not
  mutate state directly). Attack damage is
  `max(0, effect.damage + attacker.attack − target.defense)` and critical is
  `max(0, effect.criticalDamage − target.criticalDefense)`.
- **advance** — increments the index; when it reaches the sequence length,
  removes `actionState` (action complete). An N-effect action takes N
  actor-ticks.

**Events.** Emitting an event both queues it on `engine.events` *and* appends it
to the target's `observable` inbox (and the source's, if source ≠ target). So an
event is simultaneously a state-change instruction and an observation. The
**resolve** system drains `engine.events` and applies each: `damage`/`heal`
feed the accumulators (they do not touch `hp` directly); `drop`/`take`/`move`
re-point `location` and dirty the affected `contents` caches; `equip`/`unequip`
edit `equipment` and dirty its cache; `stats` applies a computed block;
`status` merges status effects; `dead`/`unconscious` set the flags; `action` is
a no-op notification. Because resolve runs several times per pipeline, events
emitted in one phase are committed state by the next.

## 7. Control

Control is pluggable — the same "begin action → run ActionState" machinery is
fed by any controller:

- **PlayerController** `{ id, actionQueue, hotkeyMap }` — human-driven. Actions
  are a strict FIFO queue of `{ action, targets }` intents; `hotkeyMap` maps
  input keys to actions.
- **SequenceController** `{ sequenceIndex }` — a scripted actor that cycles
  through its own `actions` list by index (wrapping), then picks a target: it
  shuffles the candidate set (its location's `contents`, or `[self]`) and takes
  the first candidate the whole action validates against. If none validates, it
  acts on nothing this pass. *(The shuffle uses unseeded `Math.random`, so AI
  target choice is nondeterministic — see §13.)*
- **AwarenessController** `{ state: "idle" | "alert" }` — a reactive AI whose
  behavior depends on an awareness state. Declared as a concept; no system
  consumes it yet.

**Precedence.** A `validate` step runs before the controllers: if an entity has
*both* a player and a sequence controller, the sequence controller is removed —
human intent preempts AI.

## 8. Status effects

Five duration-based status effects, each a component with its own per-tick
system (all run in the actor band, before actions):

- **poison** `{ damage, delay, duration }` — while `delay > 0`, decrement delay
  (grace period); otherwise add `damage` to `accumulatedDamage` and decrement
  `duration`; remove when `duration ≤ 0`. Damage-over-time via the normal
  accumulation pipeline.
- **regeneration** `{ heal, delay, duration }` — the healing mirror of poison
  (into `accumulatedHealing`).
- **advantage** `{ attack, duration }` — contributes `+attack` while active;
  decrements `duration`, removes at 0 (dirtying the status stat cache).
- **guard** `{ defense, duration }` — contributes `+defense`; same lifecycle.
- **fortify** `{ mhp, duration }` — contributes `+mhp` (transiently raising
  current HP via the delta rule); same lifecycle.

**Stacking** (when applying an effect the entity already has):

- poison / regeneration: magnitude = `max`, `delay` = `max`, **`duration` =
  sum** (durations add; potency and delay take the stronger).
- advantage / guard / fortify: magnitude = `max`, `duration` = `max` (refresh to
  the strongest/longest; do not extend by summing).

Any application dirties the status stat cache. poison/regeneration have no
stat-block contribution (they act via accumulation); advantage/guard/fortify
have no per-tick damage but feed stats.

## 9. Damage and the vitals lifecycle

A **two-track HP model**: transient `hp` versus persistent `cdp` (critical
damage). Damage is *staged then committed* so a whole round's inflows combine
before thresholds are checked:

1. Attacks and poison push into `accumulatedDamage`; heals and regeneration into
   `accumulatedHealing`; inherent/critical into `accumulatedCriticalDamage`.
2. **damageToCriticalDamage** — a big single-round hit spills into critical
   damage: `crit = max(0, floor(accumulatedDamage / criticalDamageThreshold) −
   criticalDefense)`; if positive, added to `accumulatedCriticalDamage`. Lower
   threshold → more of each hit becomes lasting injury.
3. Apply accumulators: healing adds to `hp`, damage subtracts from `hp`, critical
   adds to `cdp`; each accumulator is then zeroed.
4. **Clamp:** `hp → [0, mhp]`, `ep → [0, mep]`, `cdp → [0, mhp]`.
5. **unconscious** when `hp ≤ cdp` (accumulated critical injury has eaten your
   effective HP). **dead** when `cdp ≥ mhp` (lasting injury reached your max).
   These are emitted as events and committed by the final resolve.

Critical damage (`cdp`) is **not** undone by ordinary healing — `hp` recovers but
`cdp` represents durable injury that gates unconsciousness and death.
`unconscious`/`dead` entities are excluded from control assignment and from
effect execution — they cannot act.

## 10. Events and observation

A per-tick publish/subscribe over co-located entities:

- **resetObservers** (first each tick) clears every `observer` inbox.
- Throughout the tick, emitting events appends them to targets' (and sources')
  `observable` logs.
- **observation** (last each tick) distributes: an unlocated entity moves its own
  `observable` into its own `observer` (you always perceive what happens to you);
  located entities' events are grouped by `location` into a per-room set, and
  every observer in a room receives that room's deduplicated event set.

This drives rendering and AI awareness without any system directly coupling to
another.

## 11. Location, contents, and movement

`location` is authoritative — it points an entity at its container (a room, or
another entity acting as inventory). `contents` is a *cached reverse index*
rebuilt by the `contents` system from occupants' `location`s and guarded by
`contentsCleanFlag`; move/take/drop/equip events dirty exactly the affected
containers so only they recompute. `locationMapName` propagates a room's map name
down onto its occupants so an entity knows which map it is in.

Movement is just an action targeting a **path entity** (a directed edge
`{ location, path: { destination } }`), resolved through move → advance →
resolve.

## 12. Maps

A map is a seed-driven graph of rooms. Entity roles:

- **MapEntity** — the generator spec (theme, layout, room counts, decoration
  range, loop count, entrypoint fields, seed).
- **RoomEntity** — `{ name, contents, locationMapName }`.
- **PathEntity** — a one-way connection `{ location, path: { destination } }`.
  Bidirectional connectivity is two directed paths.
- **DecorationEntity** — a themed prop placed in a room.

**Generation** (deterministic from the map's `seed`):

1. Create `mapTotalRoomCount` rooms named `Room 0 … Room N−1`.
2. Walking the rooms in order, keeping a `previousRoom`:
   - link the current room to `previousRoom` with mutual (two directed) paths;
   - if within the last `mapLoopCount` rooms, also link back to a random earlier
     room (introducing cycles);
   - scatter `[mapMinDecorationCount, mapMaxDecorationCount)` decorations sampled
     from the theme's prefab palette;
   - if `i < mapMainPathRoomCount` the next `previousRoom` is this room (a linear
     "critical path"); otherwise `previousRoom` becomes a random earlier room
     (branching off the main path).

**Lazy realization.** Maps are realized based on where players are. The
`mapGeneration` system collects the maps players occupy plus (transitively) any
map whose `entrypointMapName` is among them, unloads entities in maps no longer
needed, and realizes any needed-but-unrealized map by generating and adding its
rooms/paths/decorations. `entryLocation` then drops a player who has a
`locationMapName` but no `location` into that map's entry room
(`mapRealizedRoomEntities[0]`).

## 13. Determinism and RNG

- **Deterministic:** anything driven by a `seed`. The RNG is Prando
  (string or numeric seed, stateful/sequential — the Nth draw from a given seed
  is always the same; equal seeds give identical sequences). Map generation
  constructs one RNG from the map's seed and derives all randomness (decoration
  counts, decoration choices, branch/loop targets) from it, so a seed reproduces
  the exact same map. The `sample(items, lo=0, hi=len)` helper uses Prando's
  **inclusive-both-ends** `nextInt`, picking an index in `[lo, hi−1]` (which is
  why generation uses `nextInt(min, max−1)` and `sample(rooms, 0, i)` for a
  strictly-earlier room).
- **Nondeterministic (intentional or incidental):** the wall-clock engine tick;
  AI target selection in `sequenceControl` (unseeded `Math.random` shuffle); and,
  deliberately, loot — rewards should be unpredictable outside tests.

## 14. The per-tick system pipeline (ordered)

Order is load-bearing. Per tick:

**Outer band (every tick):**
1. `resetObservers` — clear observer inboxes.
2. `control.validate` — resolve controller conflicts (player preempts sequence).
3. `control.playerControl` — pull the next queued player action into
   `actionState`.
4. `control.sequenceControl` — assign scripted/AI actions.

**Actor band (only on `actorPeriodMS` boundaries, with catch-up):**
5. Status ticks: `poison`, `regeneration`, `advantage`, `guard`, `fortify`.
6. `action.begin` — emit the `action` event on the first frame.
7. `action.buff`, `action.unequip`, `action.equip`.
8. **resolve** (drain 1) — settle buffs/status/equipment changes.
9. Stat recompute: `stats.equipment`, `stats.status`, `stats.apply`.
10. **resolve** (drain 2) — apply the recomputed stats, so an attack later this
    turn uses post-equip/post-status `attack`/`defense`.
11. `action.attack`, `action.drop`, `action.take`, `action.move`.
12. `action.advance` — advance the effect cursor (last, so every effect system
    saw the same index this tick).
13. **resolve** (drain 3) — settle damage/heal/move/take/drop.
14. `player.mapGeneration` — realize/unrealize maps.

**Outer band resumes (every tick):**
15. `locationMapName` — propagate map name to occupants.
16. `player.entryLocation` — place unlocated players in their map's entry room.
17. Damage pipeline: `damageToCriticalDamage`, `healingTaker`,
    `applyAccumulatedDamage`, `applyAccumulatedCriticalDamage`.
18. Clamps: `hp`, `ep`, `cdp`.
19. **resolve** (drain 4).
20. `unconscious`, `dead` — flag from settled `hp`/`cdp`/`mhp`.
21. `contents` — rebuild container contents from occupants' `location`.
22. Stat recompute: `stats.traits`, `stats.equipment`, `stats.status`,
    `stats.apply`.
23. **resolve** (drain 5) — apply stats and commit the `unconscious`/`dead`
    flags.
24. `event.observation` — distribute observable events to co-located observers,
    last, so observers see the fully-resolved tick.

Why the order matters, in brief: controllers install intent before actions read
it; status ticks stage their damage/heal before actions and stat recompute;
`begin` before / `advance` after the effect systems keeps a stable index within a
tick; the three actor-band drains phase buffs → stats → attacks so attacks use
up-to-date stats; the damage pipeline converts-then-applies-then-clamps before
death/unconscious are judged; observation runs last.

Note: an `allegiance`-flattening system exists (collapse allegiance chains to a
root, detecting cycles) but is not wired into the default pipeline — allegiance
is read directly by effect validation and assumed already flat.

## 15. Behavioral invariants (locked in by the reference tests)

The reference test suite pinned these semantics; preserve them:

- **`location` is source-of-truth; `contents` is a cached reverse index.** Before
  the `contents` system runs, rooms report empty contents even though occupants
  point at them via `location`. A move dirties *exactly* the source and
  destination room caches (dirty-flag optimization); after recompute, membership
  and flags are consistent. Movement is an `ActionState` with action `move`
  targeting a path entity.
- **Actions resolve one effect per tick.** `effectSequenceIndex` advances
  0→1→2→3 across ticks; when the sequence is exhausted the `actionState`
  component is removed and stays removed. A leading `rest` is a no-damage
  wind-up.
- **Damage/heal/critical timeline.** Attack effects reduce `hp` by their computed
  damage; a single-tick hit equal to `criticalDamageThreshold` adds
  `floor(dmg/threshold)` to `cdp`; a large heal restores `hp` up to max while
  `cdp` persists (critical damage is sticky).
- **Poison combines as max/max/sum** (damage/delay/duration): applying
  `{1,2,2}` then `{0,0,3}` yields `{damage:1, delay:2, duration:5}`; it deals no
  damage during the delay, then 1 damage per tick for the summed duration, then
  is removed. Poison of 1 vs threshold 3 never triggers critical damage
  (`floor(1/3)=0`).

## 16. Known design intents / TODOs (from the reference)

Carried forward as intended-but-unfinished design:

- **Replace the Resource records with a runtime registry.** The name-keyed
  content records are a compile-time authoring convenience; the intent is to
  store plain entities in a runtime name-lookup registry to allow live updates
  and in-game content creation.
- **Priority-queue effect resolution.** Within a single tick, effects should
  resolve **buffs first, then attacks, then movement**. The reference's
  "loop over all actors in order" approach is inadequate; the intent is to
  separate effect *realization* from *application* and order realized effects in
  a priority queue.
- **`mapLayout` (`path`/`hub`) and the `entrypoint*` fields** are the hooks for
  joining maps into a larger world; layout selection is declared but not yet
  branched on.
- **`AwarenessController`** (idle/alert) is a declared control concept with no
  system consuming it yet.
- **Loot** (`lootQuality`, `consumable`) is reserved and intentionally
  nondeterministic.
- **Unconscious source attribution** is unresolved (currently self-attributed).
