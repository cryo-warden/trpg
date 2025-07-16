use crate::{gen_struct, gen_trait, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use syn::{Error, Result, spanned::Spanned};

pub struct WithEntityHandleTrait {
    pub delete_entity_trait: gen_trait::DeleteEntityTrait,
    pub entity_struct: gen_struct::EntityStruct,
    pub with_entity_handle_trait: gen_trait::WithEntityHandleTrait,
    pub option_component_traits: Vec<gen_trait::OptionComponentTrait>,
}

impl WithEntityHandleTrait {
    pub fn new(
        delete_entity_trait: &gen_trait::DeleteEntityTrait,
        entity_struct: &gen_struct::EntityStruct,
        with_entity_handle_trait: &gen_trait::WithEntityHandleTrait,
        option_component_traits: &[gen_trait::OptionComponentTrait],
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
        let gen_struct::EntityStruct { tables, .. } = &self.entity_struct;
        let gen_trait::WithEntityHandleTrait {
            with_entity_handle_trait,
            id_fn,
            ..
        } = &self.with_entity_handle_trait;
        let delete_calls = self.option_component_traits.iter().map(|oct| {
            let gen_trait::OptionComponentTrait { delete_fn, .. } = &oct;
            quote! { handle.#delete_fn(); }
        });
        let table = tables
            .first()
            .ok_or(Error::new(tables.span(), "Cannot find entity table."))
            .unwrap(); // WIP Change to single table for entity.
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

impl ToTokens for Impl {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            with_entity_handle_trait,
        } = self;
        tokens.extend(quote! { #with_entity_handle_trait });
    }
}
