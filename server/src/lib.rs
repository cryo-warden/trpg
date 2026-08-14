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
mod reducers;
mod role;
mod system;
mod visited;
