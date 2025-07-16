use crate::{gen_struct, gen_trait::OptionComponentTrait};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::{Error, Ident, Result};

#[derive(Clone)]
pub struct OptionComponentIterTrait {
    pub option_component_iter_trait: Ident,
    pub option_component_trait: Ident,
    pub with_component_struct: Ident,
    pub with_fn: Ident,
}

impl OptionComponentIterTrait {
    pub fn new(oct: &OptionComponentTrait, wcs: &gen_struct::WithComponentStruct) -> Self {
        Self {
            option_component_iter_trait: format_ident!("Option__{}__IterTrait", oct.component),
            option_component_trait: oct.option_component_trait.to_owned(),
            with_component_struct: wcs.with_component_struct.to_owned(),
            with_fn: oct.with_fn.to_owned(),
        }
    }

    pub fn new_vec(
        option_component_traits: &Vec<OptionComponentTrait>,
        with_component_structs: &Vec<gen_struct::WithComponentStruct>,
    ) -> Result<Vec<Self>> {
        option_component_traits
            .iter()
            .map(|oct| {
                let wcs = with_component_structs
                    .iter()
                    .find(|wcs| wcs.component == oct.component)
                    .ok_or(Error::new(
                        oct.component.span(),
                        "Cannot find the corresponding with-component struct.",
                    ))?;
                Ok(Self::new(oct, wcs))
            })
            .collect()
    }
}

impl ToTokens for OptionComponentIterTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            option_component_iter_trait,
            option_component_trait,
            with_component_struct,
            with_fn,
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #option_component_iter_trait<T: #option_component_trait>: Sized + Iterator<Item = T> {
              fn #with_fn(self) -> impl Iterator<Item = #with_component_struct<T>> {
                  self.flat_map(|e| e.#with_fn())
              }
          }
        })
    }
}
