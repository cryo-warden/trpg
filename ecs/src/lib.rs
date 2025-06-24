pub use ecs_macro::entity;

mod tests;

#[derive(Clone, Copy)]
pub struct EntityHandleHidden<'a> {
    pub ctx: &'a ::spacetimedb::ReducerContext,
}

impl<'a> ::std::fmt::Debug for EntityHandleHidden<'a> {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        f.write_str("EntityHandleHidden")?;
        ::core::result::Result::Ok(())
    }
}
