use crate::{gen_struct, gen_trait};
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
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
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
        component_delete_traits: &Vec<gen_trait::ComponentDeleteTrait>,
        option_component_traits: &Vec<gen_trait::OptionComponentTrait>,
    ) -> Result<Vec<Self>> {
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
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
        component_delete_traits: &Vec<gen_trait::ComponentDeleteTrait>,
    ) -> Vec<Self> {
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
