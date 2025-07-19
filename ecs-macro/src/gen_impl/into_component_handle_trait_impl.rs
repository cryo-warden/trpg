use crate::{fundamental, gen_struct, gen_trait, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::Result;

pub struct Ecs {
    pub into_component_handle_trait: gen_trait::IntoComponentHandleTrait,
}

impl Ecs {
    pub fn new(icht: &gen_trait::IntoComponentHandleTrait) -> Self {
        Self {
            into_component_handle_trait: icht.to_owned(),
        }
    }

    pub fn new_vec(
        ichts: &Vec<gen_trait::IntoComponentHandleTrait>,
    ) -> fundamental::TokensVec<Self> {
        ichts.iter().map(|icht| Self::new(icht)).collect()
    }
}

impl ToTokens for Ecs {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_trait::IntoComponentHandleTrait {
            into_component_handle_trait,
            into_handle_fn,
            entity_handle_struct:
                gen_struct::EntityHandleStruct {
                    entity_handle_struct,
                    id,
                    ..
                },
            with_component_struct:
                gen_struct::WithComponentStruct {
                    with_component_struct,
                    component,
                    component_ty,
                    ..
                },
        } = &self.into_component_handle_trait;
        tokens.extend(quote! {
          impl<'a> #into_component_handle_trait<'a> for ecs::Ecs<'a> {
              fn #into_handle_fn(&self, #component: #component_ty) -> #with_component_struct<#entity_handle_struct<'a>> {
                let #id = #component.#id;
                  #with_component_struct {
                    #component,
                    value: #entity_handle_struct { #id, ecs: self.clone() },
                  }
                }
              }
        });
    }
}

#[derive(ToTokens)]
pub struct Impl {
    ecs: fundamental::TokensVec<Ecs>,
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
            into_component_handle_traits,
            ..
        } = entity_traits;

        let ecs = Ecs::new_vec(into_component_handle_traits);

        Ok(Self { ecs })
    }
}
