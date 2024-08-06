# TRPG, Text Role-Playing Game

This is a set of utilities for building standalone or client-server applications to play a specific text-based RPG system.

Key parts include:

- (WIP) trpg-lib: Library for core game logic
- (TODO) trpg-console: Application for testing game systems interactively with pure text-based UI
- (TODO) trpg-web: Application for hosting a game server and web client

## Data Model

trpg-lib exposes a generalized data model that allows applications to communicate with it. Updates to the game logic in trpg-lib will not generally require any change in the applications.

trpg-lib communicates three different kinds of data models:

- Event: A data model conveying information about a one-time occurrence. Examples include a clock chiming on the hour, a bird landing on a branch, the sun setting, a cool breeze blowing across a field, someone taking aim with a bow, or an arrow lodging itself between someone's ribs. Everything trpg-lib communicates is in the form of an event. An event is always generated with respect to some observer. Observers with different senses may receive entirely different events in an otherwise identical situation.
  - Fields
    - timestamp
    - type: Determines how the event should be rendered. May signify a sound, a sight, a smell, a predatory action, a defensive action, and evasive action, or some combination of these.
    - entity patch map: Determines changes to the entities relative to the point of view.
    - metadata: Extra information which can be used by rendering but does not have any particular game impact.
- Entity: A data model which persists information about things in the game world, including both inanimate objects and people, as well as interesting places, paths, or collections of non-distinct objects or creatures. Internally represented by an ECS entity, an incomplete view of an entity is exposed by trpg-lib based on the sensory data of the specified observer.
- Action: A data model which specifies an action for a given entity to perform. Will generally include identifiers for other entities to interact with. Actions are never generated internally to the trpg-lib, so UI, AI, and event scripting are externally applied.

## Fundamental Interfaces

trpg-lib provides some key interfaces and their fundamental implementations, supporting integration and interactivity.

---

### `Observer`

- `subscribe: (observerId: number) => Subscription`

---

### `Actor`

- `act: (actorId: number, action: Action) => ActionId`
- `cancelAction: (actorId: number, actionId: ActionId) => ActionCancellationResult`
- `cancelAllActions: (actorId: number) => ActionCancellationResult[]`

---

### `TrpgWorld`

- `getController: (entityId: number) => EntityController`
- `run: () => void`
- `stopRun: () => void`
- `step: () => void`
- `createEntity: (entity: Entity) => number`
- `destroyEntity: (entityId: number) => Entity`

---

`Subscription` exposes a `query` method to select events to observe. Only future events can be observed. `Subscription` also has a `cancel` method to destroy all its queries.

Actions are a serializable data format for controlling agent entities. Actions go into a queue. Any action can be cancelled if it is still queued, and some actions can be cancelled while they are active. There is no limit on the size of the queue within the core trpg-lib, but a UI may impose some restrictions.

Entities are a serializable data format containing all data needed to instantiate an in-world entity. This form of Entity is pure configuration data and has no in-world ID.

The basic implementations of `Observer` and `Actor` are synchronous wrappers connected to an in-memory instance of the game. All the interface methods support asynchronous execution as-is, so they can also be used to wrap tRPC functionality.
