// No-panic / no-unsafe guard (project principle no-panic-no-unsafe-rust): these
// deny our hand-written code from panicking or using unsafe. clippy does not
// lint code produced by external macros (entity!, secador!, #[table],
// #[reducer]), so this binds only our own code.
#![deny(unsafe_code)]
#![deny(clippy::unwrap_used)]
#![deny(clippy::expect_used)]
#![deny(clippy::panic)]
#![deny(clippy::todo)]
#![deny(clippy::unimplemented)]
#![deny(clippy::unreachable)]

mod account;
mod action;
mod bitset;
mod quest;
mod appearance;
mod asset;
mod ecs_extension;
mod entity;
mod entity_handle_extension;
mod event;
mod item;
mod map_materialization;
mod reducers;
mod role;
mod system;
// The test-module entrypoint: extra reducers (one per test set) compiled ONLY
// under the `testing` feature, never into production. See src/test_reducers.rs.
#[cfg(feature = "testing")]
mod test_reducers;
mod turn;
mod visited;
