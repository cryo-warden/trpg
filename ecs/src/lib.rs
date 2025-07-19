use std::ops::Deref;

pub use ecs_macro::entity;
use spacetimedb::ReducerContext;

mod tests;

#[derive(Clone, Copy)]
pub struct Ecs<'a> {
    pub ctx: &'a spacetimedb::ReducerContext,
}

impl<'a> ::std::fmt::Debug for Ecs<'a> {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        f.write_str("Ecs")?;
        ::core::result::Result::Ok(())
    }
}

impl Deref for Ecs<'_> {
    type Target = spacetimedb::ReducerContext;
    fn deref(&self) -> &Self::Target {
        self.ctx
    }
}

impl<'a> Ecs<'a> {
    pub fn db(&'a self) -> &'a spacetimedb::Local {
        &self.db
    }
}

pub trait WithEcs {
    fn ecs(&self) -> Ecs;
}

impl WithEcs for ReducerContext {
    fn ecs(&self) -> Ecs {
        Ecs { ctx: self }
    }
}
