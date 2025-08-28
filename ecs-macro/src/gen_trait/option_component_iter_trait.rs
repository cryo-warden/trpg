use crate::{gen_trait, rc_slice::RcSlice};
use proc_macro2::TokenStream;
use quote::{ToTokens, format_ident, quote};
use syn::Ident;

#[derive(Clone)]
pub struct OptionComponentIterTrait {
    pub option_component_iter_trait: Ident,
    pub option_with_component_trait: Ident,
    pub with_component_struct: Ident,
    pub with_fn: Ident,
}

impl OptionComponentIterTrait {
    pub fn new(owct: &gen_trait::OptionWithComponentTrait) -> Self {
        Self {
            option_component_iter_trait: format_ident!("__{}__OptionIter", owct.component),
            option_with_component_trait: owct.option_with_component_trait.to_owned(),
            with_component_struct: owct.with_component_struct.to_owned(),
            with_fn: owct.with_fn.to_owned(),
        }
    }

    pub fn new_vec(
        option_with_component_traits: &RcSlice<gen_trait::OptionWithComponentTrait>,
    ) -> RcSlice<Self> {
        option_with_component_traits
            .iter()
            .map(|oct| Self::new(oct))
            .collect()
    }
}

impl ToTokens for OptionComponentIterTrait {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            option_component_iter_trait,
            option_with_component_trait,
            with_component_struct,
            with_fn,
        } = self;
        tokens.extend(quote! {
          #[allow(non_camel_case_types)]
          pub trait #option_component_iter_trait<T: #option_with_component_trait<Output = T>>: Sized + Iterator<Item = T> {
              fn #with_fn(self) -> impl Iterator<Item = #with_component_struct<T>> {
                  self.flat_map(|e| e.#with_fn())
              }
          }
        })
    }
}
