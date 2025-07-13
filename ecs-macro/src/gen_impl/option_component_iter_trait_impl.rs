use crate::gen_trait;
use proc_macro2::TokenStream;
use quote::{ToTokens, quote};
use syn::Ident;

pub struct OptionComponentIterator {
    pub option_component_iter_trait: Ident,
    pub option_component_trait: Ident,
}

impl OptionComponentIterator {
    pub fn new(ocit: &gen_trait::OptionComponentIterTrait) -> Self {
        Self {
            option_component_iter_trait: ocit.option_component_iter_trait.to_owned(),
            option_component_trait: ocit.option_component_trait.to_owned(),
        }
    }

    pub fn new_vec(
        option_component_iter_traits: &Vec<gen_trait::OptionComponentIterTrait>,
    ) -> Vec<Self> {
        option_component_iter_traits
            .iter()
            .map(|ocit| Self::new(ocit))
            .collect()
    }
}

impl ToTokens for OptionComponentIterator {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        let Self {
            option_component_iter_trait,
            option_component_trait,
        } = self;
        tokens.extend(quote! {
          impl<T: #option_component_trait, U: Iterator<Item = T>> #option_component_iter_trait<T> for U {}
        });
    }
}
