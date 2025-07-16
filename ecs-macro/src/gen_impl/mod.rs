use crate::{gen_struct, gen_trait, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use syn::Result;

mod component_delete_trait_impl;
mod component_struct_impl;
mod component_trait_impl;
mod delete_entity_trait_impl;
mod find_entity_handle_trait_impl;
mod new_entity_blob_trait_impl;
mod new_entity_handle_trait_impl;
mod option_component_iter_trait_impl;
mod option_component_trait_impl;
mod with_entity_handle_trait_impl;

pub struct EntityImpls {
    component_delete_trait_impl: component_delete_trait_impl::Impl,
    component_struct_impl: component_struct_impl::Impl,
    component_trait_impl: component_trait_impl::Impl,
    delete_entity_trait_impl: delete_entity_trait_impl::Impl,
    find_entity_handle_trait_impl: find_entity_handle_trait_impl::Impl,
    new_entity_handle_trait_impl: new_entity_handle_trait_impl::Impl,
    new_entity_blob_trait_impl: new_entity_blob_trait_impl::Impl,
    option_component_trait_impl: option_component_trait_impl::Impl,
    option_component_iter_trait_impl: option_component_iter_trait_impl::Impl,
    with_entity_handle_trait_impl: with_entity_handle_trait_impl::Impl,
}

impl EntityImpls {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
    ) -> Result<Self> {
        let component_delete_trait_impl = component_delete_trait_impl::Impl::new(
            entity_macro_input,
            entity_structs,
            entity_traits,
        )?;

        let component_struct_impl =
            component_struct_impl::Impl::new(entity_macro_input, entity_structs, entity_traits)?;

        let component_trait_impl =
            component_trait_impl::Impl::new(entity_macro_input, entity_structs, entity_traits)?;

        let delete_entity_trait_impl =
            delete_entity_trait_impl::Impl::new(entity_macro_input, entity_structs, entity_traits)?;

        let find_entity_handle_trait_impl = find_entity_handle_trait_impl::Impl::new(
            entity_macro_input,
            entity_structs,
            entity_traits,
        )?;

        let new_entity_handle_trait_impl = new_entity_handle_trait_impl::Impl::new(
            entity_macro_input,
            entity_structs,
            entity_traits,
        )?;

        let new_entity_blob_trait_impl = new_entity_blob_trait_impl::Impl::new(
            entity_macro_input,
            entity_structs,
            entity_traits,
        )?;

        let option_component_trait_impl = option_component_trait_impl::Impl::new(
            entity_macro_input,
            entity_structs,
            entity_traits,
        )?;

        let option_component_iter_trait_impl = option_component_iter_trait_impl::Impl::new(
            entity_macro_input,
            entity_structs,
            entity_traits,
        )?;

        let with_entity_handle_trait_impl = with_entity_handle_trait_impl::Impl::new(
            entity_macro_input,
            entity_structs,
            entity_traits,
        )?;

        Ok(Self {
            component_delete_trait_impl,
            component_struct_impl,
            component_trait_impl,
            delete_entity_trait_impl,
            find_entity_handle_trait_impl,
            new_entity_handle_trait_impl,
            new_entity_blob_trait_impl,
            option_component_trait_impl,
            option_component_iter_trait_impl,
            with_entity_handle_trait_impl,
        })
    }
}

impl ToTokens for EntityImpls {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            component_delete_trait_impl,
            component_struct_impl,
            component_trait_impl,
            delete_entity_trait_impl,
            find_entity_handle_trait_impl,
            new_entity_handle_trait_impl,
            new_entity_blob_trait_impl,
            option_component_trait_impl,
            option_component_iter_trait_impl,
            with_entity_handle_trait_impl,
        } = self;
        tokens.extend(quote! {
            #component_delete_trait_impl
            #component_struct_impl
            #component_trait_impl
            #delete_entity_trait_impl
            #find_entity_handle_trait_impl
            #new_entity_handle_trait_impl
            #new_entity_blob_trait_impl
            #option_component_trait_impl
            #option_component_iter_trait_impl
            #with_entity_handle_trait_impl
        });
    }
}
