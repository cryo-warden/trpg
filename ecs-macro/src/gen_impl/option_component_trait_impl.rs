use crate::{gen_struct, gen_trait, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::Result;

pub struct PassthroughWithComponentStruct {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub option_component_trait: gen_trait::OptionComponentTrait,
}

impl PassthroughWithComponentStruct {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        oct: &gen_trait::OptionComponentTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            option_component_trait: oct.to_owned(),
        }
    }

    pub fn new_vec(
        with_component_structs: &RcSlice<gen_struct::WithComponentStruct>,
        option_component_traits: &RcSlice<gen_trait::OptionComponentTrait>,
    ) -> RcSlice<Self> {
        with_component_structs
            .iter()
            .flat_map(|wcs| {
                option_component_traits
                    .iter()
                    .filter(|oct| oct.component != wcs.component)
                    .map(|oct| Self::new(wcs, oct))
            })
            .collect()
    }
}

impl ToTokens for PassthroughWithComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            with_component_struct,
            ..
        } = &self.with_component_struct;
        let gen_trait::OptionComponentTrait {
            option_component_trait,
            component,
            component_ty,
            getter_fn,
            insert_fn,
            update_fn,
            delete_fn,
            ..
        } = &self.option_component_trait;
        tokens.extend(quote! {
          impl<T: #option_component_trait> #option_component_trait for #with_component_struct<T> {
            fn #getter_fn(&self) -> ::core::option::Option<#component_ty> {
              self.value.#getter_fn()
            }
            fn #insert_fn(&self, #component: #component_ty) -> #component_ty {
              self.value.#insert_fn(#component)
            }
            fn #update_fn(&self, #component: #component_ty) -> #component_ty {
              self.value.#update_fn(#component)
            }
            fn #delete_fn(&self) {
              self.value.#delete_fn();
            }
          }
        });
    }
}

pub struct EntityHandleStruct {
    pub entity_handle_struct: gen_struct::EntityHandleStruct,
    pub option_component_trait: gen_trait::OptionComponentTrait,
}

impl EntityHandleStruct {
    pub fn new(
        ehs: &gen_struct::EntityHandleStruct,
        oct: &gen_trait::OptionComponentTrait,
    ) -> Self {
        Self {
            entity_handle_struct: ehs.to_owned(),
            option_component_trait: oct.to_owned(),
        }
    }

    pub fn new_vec(
        entity_handle_struct: &gen_struct::EntityHandleStruct,
        option_component_traits: &RcSlice<gen_trait::OptionComponentTrait>,
    ) -> RcSlice<Self> {
        option_component_traits
            .iter()
            .map(|oct| Self::new(entity_handle_struct, oct))
            .collect()
    }
}

impl ToTokens for EntityHandleStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::EntityHandleStruct {
            id,
            entity_handle_struct,
            ..
        } = &self.entity_handle_struct;
        let gen_trait::OptionComponentTrait {
            option_component_trait,
            component,
            component_ty,
            getter_fn,
            insert_fn,
            update_fn,
            delete_fn,
            table,
            ..
        } = &self.option_component_trait;
        tokens.extend(quote! {
          impl<'a> #option_component_trait for #entity_handle_struct<'a> {
            fn #getter_fn(&self) -> ::core::option::Option<#component_ty> {
              ::spacetimedb::UniqueColumn::find(&self.ecs.db.#table().#id(), self.#id)
            }
            fn #insert_fn(&self, mut #component: #component_ty) -> #component_ty {
              #component.#id = self.#id;
              ::spacetimedb::Table::insert(self.ecs.db.#table(), #component)
            }
            fn #update_fn(&self, mut #component: #component_ty) -> #component_ty {
              #component.#id = self.#id;
              ::spacetimedb::UniqueColumn::update(&self.ecs.db.#table().#id(), #component)
            }
            fn #delete_fn(&self) {
              ::spacetimedb::UniqueColumn::delete(&self.ecs.db.#table().#id(), self.#id);
            }
          }
        });
    }
}

#[derive(ToTokens)]
pub struct Impl {
    with_component_structs: RcSlice<PassthroughWithComponentStruct>,
    entity_handle_structs: RcSlice<EntityHandleStruct>,
}

impl Impl {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
    ) -> Result<Self> {
        let _ = entity_macro_input;
        let gen_struct::EntityStructs {
            with_component_structs,
            entity_handle_struct,
            ..
        } = entity_structs;
        let gen_trait::EntityTraits {
            option_component_traits,
            ..
        } = entity_traits;

        let with_component_structs = PassthroughWithComponentStruct::new_vec(
            with_component_structs,
            option_component_traits,
        );

        let entity_handle_structs =
            EntityHandleStruct::new_vec(entity_handle_struct, option_component_traits);

        Ok(Self {
            with_component_structs,
            entity_handle_structs,
        })
    }
}
