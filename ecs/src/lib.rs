mod tests;

pub use ecs_macro::entity;
use std::fmt::Debug;

#[derive(Clone, Copy)]
pub struct EntityHandleHidden<'a> {
    pub ctx: &'a spacetimedb::ReducerContext,
}

impl<'a> Debug for EntityHandleHidden<'a> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("EntityHandleHidden")?;
        Ok(())
    }
}
