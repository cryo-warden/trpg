pub use ecs_macro::entity;
use spacetimedb::ReducerContext;

mod tests;

#[derive(Clone, Copy)]
pub struct Ecs<'a> {
    pub db: &'a spacetimedb::Local,
}

impl<'a> ::std::fmt::Debug for Ecs<'a> {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        f.write_str("Ecs")?;
        ::core::result::Result::Ok(())
    }
}

impl<'a> Ecs<'a> {
    pub fn db(&self) -> &'a spacetimedb::Local {
        self.db
    }
}

pub trait WithEcs {
    fn ecs(&self) -> Ecs;
}

impl WithEcs for ReducerContext {
    fn ecs(&self) -> Ecs {
        Ecs { db: &self.db }
    }
}
