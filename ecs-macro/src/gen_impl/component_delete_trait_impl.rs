use crate::RcSlice;
use crate::{gen_struct, gen_trait, macro_input};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use structmeta::ToTokens;
use syn::{Error, Result};

pub struct ReplacementWithComponentStruct {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub component_delete_trait: gen_trait::ComponentDeleteTrait,
    pub option_component_trait: gen_trait::OptionComponentTrait,
}

impl ReplacementWithComponentStruct {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        cdt: &gen_trait::ComponentDeleteTrait,
        oct: &gen_trait::OptionComponentTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            component_delete_trait: cdt.to_owned(),
            option_component_trait: oct.to_owned(),
        }
    }

    pub fn new_vec(
        with_component_structs: &RcSlice<gen_struct::WithComponentStruct>,
        component_delete_traits: &RcSlice<gen_trait::ComponentDeleteTrait>,
        option_component_traits: &RcSlice<gen_trait::OptionComponentTrait>,
    ) -> Result<RcSlice<Self>> {
        with_component_structs
            .iter()
            .map(|wcs| {
                let cdt = component_delete_traits
                    .iter()
                    .find(|cdt| cdt.component == wcs.component)
                    .ok_or(Error::new(
                        wcs.component.span(),
                        "Cannot find the corresponding component delete trait.",
                    ))?;
                let oct = option_component_traits
                    .iter()
                    .find(|ct| ct.component == wcs.component)
                    .ok_or(Error::new(
                        wcs.component.span(),
                        "Cannot find the corresponding option component trait.",
                    ))?;
                Ok(Self::new(wcs, cdt, oct))
            })
            .collect()
    }
}

impl ToTokens for ReplacementWithComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            with_component_struct,
            ..
        } = &self.with_component_struct;
        let gen_trait::ComponentDeleteTrait {
            component_delete_trait,
            delete_fn,
            ..
        } = &self.component_delete_trait;
        let gen_trait::OptionComponentTrait {
            option_component_trait,
            delete_fn: option_delete_fn,
            ..
        } = &self.option_component_trait;
        tokens.extend(quote! {
          impl<T: #option_component_trait> #component_delete_trait<T> for #with_component_struct<T> {
            fn #delete_fn(mut self) -> T {
              self.value.#option_delete_fn();
              self.value
            }
          }
        });
    }
}

pub struct PassthroughWithComponentStruct {
    pub with_component_struct: gen_struct::WithComponentStruct,
    pub component_delete_trait: gen_trait::ComponentDeleteTrait,
}

impl PassthroughWithComponentStruct {
    pub fn new(
        wcs: &gen_struct::WithComponentStruct,
        cdt: &gen_trait::ComponentDeleteTrait,
    ) -> Self {
        Self {
            with_component_struct: wcs.to_owned(),
            component_delete_trait: cdt.to_owned(),
        }
    }

    pub fn new_vec(
        with_component_structs: &RcSlice<gen_struct::WithComponentStruct>,
        component_delete_traits: &RcSlice<gen_trait::ComponentDeleteTrait>,
    ) -> RcSlice<Self> {
        with_component_structs
            .iter()
            .flat_map(|wcs| {
                component_delete_traits
                    .iter()
                    .filter(|ct| ct.component != wcs.component)
                    .map(|cdt| Self::new(wcs, cdt))
            })
            .collect()
    }
}

impl ToTokens for PassthroughWithComponentStruct {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let gen_struct::WithComponentStruct {
            with_component_struct,
            component,
            ..
        } = &self.with_component_struct;
        let gen_trait::ComponentDeleteTrait {
            component_delete_trait,
            delete_fn,
            ..
        } = &self.component_delete_trait;
        tokens.extend(quote! {
        impl<T: #component_delete_trait<U>, U: Sized> #component_delete_trait<#with_component_struct<U>> for #with_component_struct<T> {
          fn #delete_fn(mut self) -> #with_component_struct<U> {
            #with_component_struct::<U> {
              #component: self.#component,
              value: self.value.#delete_fn(),
            }
          }
        }
      });
    }
}

#[derive(ToTokens)]
pub struct Impl {
    replacement_with_component_structs: RcSlice<ReplacementWithComponentStruct>,
    passthrough_with_component_structs: RcSlice<PassthroughWithComponentStruct>,
}

impl Impl {
    pub fn new(
        entity_macro_input: &macro_input::EntityMacroInput,
        entity_structs: &gen_struct::EntityStructs,
        entity_traits: &gen_trait::EntityTraits,
        component_modules: &RcSlice<crate::gen_component_module::component_module::ComponentModule>,
    ) -> Result<Self> {
        let _ = entity_macro_input;
        let _ = component_modules;

        let gen_struct::EntityStructs {
            with_component_structs,
            ..
        } = entity_structs;
        let gen_trait::EntityTraits {
            component_delete_traits,
            option_component_traits,
            ..
        } = entity_traits;

        let replacement_with_component_structs = ReplacementWithComponentStruct::new_vec(
            with_component_structs,
            component_delete_traits,
            option_component_traits,
        )?;

        let passthrough_with_component_structs = PassthroughWithComponentStruct::new_vec(
            with_component_structs,
            component_delete_traits,
        );

        Ok(Self {
            replacement_with_component_structs,
            passthrough_with_component_structs,
        })
    }
}
