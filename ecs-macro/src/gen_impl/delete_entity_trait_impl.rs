use crate::{RcSlice, gen_struct, gen_trait, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::Result;

pub struct WithEntityHandleTrait {
    pub delete_entity_trait: gen_trait::DeleteEntityTrait,
    pub entity_struct: gen_struct::EntityStruct,
    pub with_entity_handle_trait: gen_trait::WithEntityHandleTrait,
    pub option_component_traits: RcSlice<gen_trait::OptionComponentTrait>,
}

impl WithEntityHandleTrait {
    pub fn new(
        delete_entity_trait: &gen_trait::DeleteEntityTrait,
        entity_struct: &gen_struct::EntityStruct,
        with_entity_handle_trait: &gen_trait::WithEntityHandleTrait,
        option_component_traits: &RcSlice<gen_trait::OptionComponentTrait>,
    ) -> Self {
        Self {
            delete_entity_trait: delete_entity_trait.to_owned(),
            entity_struct: entity_struct.to_owned(),
            with_entity_handle_trait: with_entity_handle_trait.to_owned(),
            option_component_traits: option_component_traits.to_owned(),
        }
    }
}

impl ToTokens for WithEntityHandleTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_trait::DeleteEntityTrait {
            delete_entity_trait,
            ..
        } = &self.delete_entity_trait;
        let gen_struct::EntityStruct { table, .. } = &self.entity_struct;
        let gen_trait::WithEntityHandleTrait {
            with_entity_handle_trait,
            id_fn,
            ..
        } = &self.with_entity_handle_trait;
        let delete_calls = self.option_component_traits.iter().map(|oct| {
            let gen_trait::OptionComponentTrait { delete_fn, .. } = &oct;
            quote! { handle.#delete_fn(); }
        });
        tokens.extend(quote! {
          impl<'a, T: #with_entity_handle_trait<'a>> #delete_entity_trait for T {
              fn delete(&self) {
                let handle = self.to_handle();
                ::spacetimedb::UniqueColumn::delete(&handle.ecs.db.#table().id(), handle.#id_fn());
                #(#delete_calls)*
              }
          }
        });
    }
}

#[derive(ToTokens)]
pub struct Impl {
    with_entity_handle_trait: WithEntityHandleTrait,
}

impl Impl {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
    ) -> Result<Self> {
        let _ = entity_macro_input;
        let gen_struct::EntityStructs { entity_struct, .. } = entity_structs;
        let gen_trait::EntityTraits {
            delete_entity_trait,
            option_component_traits,
            with_entity_handle_trait,
            ..
        } = entity_traits;

        let with_entity_handle_trait = WithEntityHandleTrait::new(
            delete_entity_trait,
            entity_struct,
            with_entity_handle_trait,
            option_component_traits,
        );

        Ok(Self {
            with_entity_handle_trait,
        })
    }
}
