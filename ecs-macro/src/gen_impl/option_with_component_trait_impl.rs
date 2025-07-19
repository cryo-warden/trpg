use crate::{gen_struct, gen_trait, macro_input, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::{Error, Result};

pub struct OptionGetComponentTrait {
    pub option_get_component_trait: gen_trait::OptionGetComponentTrait,
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub option_with_component_trait: gen_trait::OptionWithComponentTrait,
}

impl OptionGetComponentTrait {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        ogct: &gen_trait::OptionGetComponentTrait,
        owct: &gen_trait::OptionWithComponentTrait,
    ) -> Self {
        Self {
            option_get_component_trait: ogct.to_owned(),
            with_component_struct: wcs.to_owned(),
            option_with_component_trait: owct.to_owned(),
        }
    }

    pub fn new_vec(
        with_component_structs: &RcSlice<gen_struct::WithComponentStruct>,
        option_get_component_traits: &RcSlice<gen_trait::OptionGetComponentTrait>,
        option_with_component_traits: &RcSlice<gen_trait::OptionWithComponentTrait>,
    ) -> Result<RcSlice<Self>> {
        option_get_component_traits
            .iter()
            .map(|ogct| {
                let wcs = with_component_structs
                    .iter()
                    .find(|wcs| ogct.component == wcs.component)
                    .ok_or(Error::new(
                        ogct.component.span(),
                        "Failed to find matching component.",
                    ))?;
                let owct = option_with_component_traits
                    .iter()
                    .find(|owct| ogct.component == owct.component)
                    .ok_or(Error::new(
                        ogct.component.span(),
                        "Failed to find matching component.",
                    ))?;

                Ok(Self::new(wcs, ogct, owct))
            })
            .collect()
    }
}

impl ToTokens for OptionGetComponentTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            with_component_struct,
            ..
        } = &self.with_component_struct;
        let gen_trait::OptionGetComponentTrait {
            option_get_component_trait,
            component,
            getter_fn,
            ..
        } = &self.option_get_component_trait;
        let gen_trait::OptionWithComponentTrait {
            option_with_component_trait,
            with_fn,
            ..
        } = &self.option_with_component_trait;
        tokens.extend(quote! {
          impl<T: #option_get_component_trait> #option_with_component_trait for T {
            type Output = T;
            fn #with_fn(self) -> ::core::option::Option<#with_component_struct<Self::Output>> {
              ::core::option::Option::Some(#with_component_struct {
                #component: self.#getter_fn()?,
                value: self,
              })
            }
          }
        });
    }
}

pub struct Option {
    pub option_with_component_trait: gen_trait::OptionWithComponentTrait,
}

impl Option {
    pub fn new(owct: &gen_trait::OptionWithComponentTrait) -> Self {
        Self {
            option_with_component_trait: owct.to_owned(),
        }
    }

    pub fn new_vec(
        option_with_component_traits: &RcSlice<gen_trait::OptionWithComponentTrait>,
    ) -> RcSlice<Self> {
        option_with_component_traits
            .iter()
            .map(|owct| Self::new(owct))
            .collect()
    }
}

impl ToTokens for Option {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_trait::OptionWithComponentTrait {
            option_with_component_trait,
            with_fn,
            with_component_struct,
            ..
        } = &self.option_with_component_trait;
        tokens.extend(quote! {
          impl<T: #option_with_component_trait<Output = T>> #option_with_component_trait for ::core::option::Option<T> {
            type Output = T;
            fn #with_fn(self) -> ::core::option::Option<#with_component_struct<Self::Output>> {
              self.and_then(#option_with_component_trait::#with_fn)
            }
          }
        });
    }
}

#[derive(ToTokens)]
pub struct Impl {
    option_get_component_trait: RcSlice<OptionGetComponentTrait>,
    option: RcSlice<Option>,
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
            ..
        } = entity_structs;
        let gen_trait::EntityTraits {
            option_get_component_traits,
            option_with_component_traits,
            ..
        } = entity_traits;

        let option_get_component_trait = OptionGetComponentTrait::new_vec(
            with_component_structs,
            option_get_component_traits,
            option_with_component_traits,
        )?;

        let option = Option::new_vec(option_with_component_traits);

        Ok(Self {
            option_get_component_trait,
            option,
        })
    }
}
