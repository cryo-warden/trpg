use crate::{fundamental, gen_struct, macro_input};
pub use component_delete_trait::ComponentDeleteTrait;
pub use component_trait::ComponentTrait;
pub use delete_entity_trait::DeleteEntityTrait;
pub use find_entity_handle_trait::FindEntityHandleTrait;
pub use into_component_handle_trait::IntoComponentHandleTrait;
pub use iter_component_trait::IterComponentTrait;
pub use new_entity_blob_trait::NewEntityBlobTrait;
pub use new_entity_handle_trait::NewEntityHandleTrait;
pub use option_component_iter_trait::OptionComponentIterTrait;
pub use option_component_trait::OptionComponentTrait;
use structmeta::ToTokens;
use syn::Result;
pub use with_entity_handle_trait::WithEntityHandleTrait;

mod component_delete_trait;
mod component_trait;
mod delete_entity_trait;
mod find_entity_handle_trait;
mod into_component_handle_trait;
mod iter_component_trait;
mod new_entity_blob_trait;
mod new_entity_handle_trait;
mod option_component_iter_trait;
mod option_component_trait;
mod with_entity_handle_trait;

#[derive(ToTokens)]
pub struct EntityTraits {
    pub delete_entity_trait: DeleteEntityTrait,
    pub new_entity_blob_trait: Option<NewEntityBlobTrait>,
    pub new_entity_handle_trait: NewEntityHandleTrait,
    pub find_entity_handle_trait: FindEntityHandleTrait,
    pub into_component_handle_traits: fundamental::TokensVec<IntoComponentHandleTrait>,
    pub iter_component_traits: fundamental::TokensVec<IterComponentTrait>,
    pub with_entity_handle_trait: WithEntityHandleTrait,
    pub component_traits: fundamental::TokensVec<ComponentTrait>,
    pub component_delete_traits: fundamental::TokensVec<ComponentDeleteTrait>,
    pub option_component_traits: fundamental::TokensVec<OptionComponentTrait>,
    pub option_component_iter_traits: fundamental::TokensVec<OptionComponentIterTrait>,
}

impl EntityTraits {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
    ) -> Result<Self> {
        let macro_input::EntityMacroInput {
            component_declarations,
            ..
        } = entity_macro_input;
        let gen_struct::EntityStructs {
            with_component_structs,
            entity_handle_struct,
            entity_blob_struct,
            ..
        } = entity_structs;
        let entity_blob_struct = entity_blob_struct.as_ref();

        let new_entity_blob_trait = NewEntityBlobTrait::new(entity_blob_struct);
        let new_entity_handle_trait = NewEntityHandleTrait::new(entity_handle_struct);
        let find_entity_handle_trait = FindEntityHandleTrait::new(entity_handle_struct);
        let with_entity_handle_trait = WithEntityHandleTrait::new(entity_handle_struct);
        let delete_entity_trait = DeleteEntityTrait::new();
        let component_traits = ComponentTrait::new_vec(component_declarations);
        let component_delete_traits = ComponentDeleteTrait::new_vec(component_declarations);
        let option_component_traits =
            OptionComponentTrait::new_vec(component_declarations, with_component_structs)?;
        let option_component_iter_traits =
            OptionComponentIterTrait::new_vec(&option_component_traits, with_component_structs)?;
        let iter_component_traits = IterComponentTrait::new_vec(
            component_declarations,
            with_component_structs,
            entity_handle_struct,
        )?;
        let into_component_handle_traits = IntoComponentHandleTrait::new_vec(
            component_declarations,
            with_component_structs,
            entity_handle_struct,
        )?;

        Ok(Self {
            delete_entity_trait,
            new_entity_blob_trait,
            new_entity_handle_trait,
            find_entity_handle_trait,
            into_component_handle_traits,
            iter_component_traits,
            with_entity_handle_trait,
            component_traits,
            component_delete_traits,
            option_component_traits,
            option_component_iter_traits,
        })
    }
}
