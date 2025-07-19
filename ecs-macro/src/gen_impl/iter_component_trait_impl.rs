use crate::{gen_struct, gen_trait, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::Result;

pub struct EcsStruct {
    pub iter_component_trait: gen_trait::IterComponentTrait,
}

impl EcsStruct {
    pub fn new(iter_component_trait: &gen_trait::IterComponentTrait) -> Self {
        Self {
            iter_component_trait: iter_component_trait.to_owned(),
        }
    }

    pub fn new_vec(icts: &RcSlice<gen_trait::IterComponentTrait>) -> RcSlice<Self> {
        icts.iter().map(|ict| Self::new(ict)).collect()
    }
}

impl ToTokens for EcsStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_trait::IterComponentTrait {
            component,
            table,
            iter_component_trait,
            entity_handle_struct:
                gen_struct::EntityHandleStruct {
                    entity_handle_struct,
                    id,
                    ..
                },
            with_component_struct,
            iter_fn,
        } = &self.iter_component_trait;
        tokens.extend(quote! {
          impl<'a> #iter_component_trait<'a> for ecs::Ecs<'a> {
              fn #iter_fn(&self) -> impl Iterator<Item = #with_component_struct<#entity_handle_struct<'a>>> {
                ::spacetimedb::Table::iter(self.db.#table()).map(|c| {
                  let #id = c.#id;
                  #with_component_struct {
                    #component: c,
                    value: #entity_handle_struct { #id, ecs: self.clone() },
                  }
              })
            }
          }
        });
    }
}

#[derive(ToTokens)]
pub struct Impl {
    ecs_structs: RcSlice<EcsStruct>,
}

impl Impl {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
    ) -> Result<Self> {
        let _ = entity_macro_input;
        let _ = entity_structs;
        let gen_trait::EntityTraits {
            iter_component_traits,
            ..
        } = entity_traits;

        let ecs_structs = EcsStruct::new_vec(iter_component_traits);

        Ok(Self { ecs_structs })
    }
}
